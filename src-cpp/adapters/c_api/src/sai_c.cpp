#include "sai_c.h"

#include <cstddef>
#include <cstdint>
#include <exception>
#include <new>
#include <optional>
#include <span>
#include <stdexcept>
#include <string_view>
#include <vector>

#include "sai/analysis/descriptive.hpp"
#include "sai/core/data_view.hpp"
#include "sai/core/diagnostic.hpp"

namespace {

using sai::analysis::DescriptiveOptions;
using sai::analysis::DescriptiveResult;
using sai::core::Diagnostic;
using sai::core::NumericColumnView;

// The C representation of a flag. The boundary carries 0 and 1 rather than a
// bool, whose size the C ABI leaves to the implementation.
constexpr std::uint8_t c_false = 0;
constexpr std::uint8_t c_true = 1;

// The version exists only in the build system, so it arrives as a compile
// definition; src-cpp/CMakeLists.txt sets it from the project version. A build
// that forgets it fails here rather than reporting an engine nobody can place.
constexpr const char* sai_engine_version_text = SAI_ENGINE_VERSION;

// A null pointer means an absent array, not an empty one.
template <typename T>
[[nodiscard]] std::span<const T> as_span(const T* data, std::size_t count) noexcept {
    if (data == nullptr) {
        return {};
    }
    return std::span<const T>{data, count};
}

// Field by field, because the layout of std::span and std::string_view is
// unspecified.
[[nodiscard]] NumericColumnView to_view(const SaiNumericColumn& column) noexcept {
    const std::string_view name =
        column.name == nullptr ? std::string_view{}
                               : std::string_view{column.name, column.name_length};
    return NumericColumnView{
        as_span(column.values, column.value_count),
        as_span(column.missing_mask, column.missing_mask_count),
        name,
    };
}

// Failing to report an error must not raise a second one.
[[nodiscard]] SaiErrorMessage copy_message(std::string_view text) noexcept {
    char* const buffer = new (std::nothrow) char[text.size() + 1];
    if (buffer == nullptr) {
        return SaiErrorMessage{};
    }
    text.copy(buffer, text.size());
    buffer[text.size()] = '\0';
    return SaiErrorMessage{buffer, text.size()};
}

void set_error(SaiErrorMessage* out_error, std::string_view text) noexcept {
    if (out_error != nullptr) {
        *out_error = copy_message(text);
    }
}

[[nodiscard]] SaiOptionalDouble to_c(const std::optional<double>& value) noexcept {
    if (!value.has_value()) {
        return SaiOptionalDouble{0.0, c_false};
    }
    return SaiOptionalDouble{*value, c_true};
}

[[nodiscard]] std::uint8_t to_c(bool flag) noexcept {
    return flag ? c_true : c_false;
}

[[nodiscard]] SaiDiagnostic to_c(const Diagnostic& diagnostic) noexcept {
    return SaiDiagnostic{
        static_cast<std::int32_t>(diagnostic.code),
        diagnostic.target.data(),
        diagnostic.target.size(),
        diagnostic.count,
    };
}

[[nodiscard]] DescriptiveOptions from_c(const SaiDescriptiveOptions* options) noexcept {
    if (options == nullptr) {
        return DescriptiveOptions{};
    }
    // Any nonzero value asks for the statistic, so a caller that writes a
    // different truth value than 1 is not silently ignored.
    return DescriptiveOptions{
        options->include_skewness != c_false,
        options->include_kurtosis != c_false,
    };
}

// The engine reports a value at most once, so the capacity of the result holds
// one diagnostic per statistic. Exceeding it would mean the engine changed and
// this adapter did not.
[[nodiscard]] bool copy_diagnostics(const std::vector<Diagnostic>& diagnostics,
                                    SaiDescriptiveResult& out_result) noexcept {
    if (diagnostics.size() > sai_descriptive_diagnostic_capacity) {
        return false;
    }
    for (std::size_t index = 0; index < diagnostics.size(); ++index) {
        out_result.diagnostics[index] = to_c(diagnostics[index]);
    }
    out_result.diagnostic_count = diagnostics.size();
    return true;
}

[[nodiscard]] bool to_c(const DescriptiveResult& result,
                        SaiDescriptiveResult& out_result) noexcept {
    out_result = SaiDescriptiveResult{};
    out_result.total_count = result.total_count;
    out_result.valid_count = result.valid_count;
    out_result.missing_count = result.missing_count;
    out_result.mean = to_c(result.mean);
    out_result.standard_deviation = to_c(result.standard_deviation);
    out_result.minimum = to_c(result.minimum);
    out_result.median = to_c(result.median);
    out_result.maximum = to_c(result.maximum);
    out_result.skewness = to_c(result.skewness);
    out_result.kurtosis = to_c(result.kurtosis);
    out_result.applied_options = SaiDescriptiveOptions{
        to_c(result.applied_options.include_skewness),
        to_c(result.applied_options.include_kurtosis),
    };
    return copy_diagnostics(result.diagnostics, out_result);
}

// validate() has accepted the column, so the mask holds only 0 and 1 and its
// length matches.
[[nodiscard]] std::size_t count_valid(const NumericColumnView& column) noexcept {
    if (column.missing_mask.empty()) {
        return column.size();
    }
    std::size_t valid = 0;
    for (std::size_t row_index = 0; row_index < column.size(); ++row_index) {
        if (!column.is_missing(row_index)) {
            ++valid;
        }
    }
    return valid;
}

}  // namespace

extern "C" {

SaiStatus sai_numeric_column_counts(const SaiNumericColumn* column,
                                    SaiColumnCounts* out_counts,
                                    SaiErrorMessage* out_error) noexcept {
    // So a caller reusing the structure never reads an earlier call's message.
    if (out_error != nullptr) {
        *out_error = SaiErrorMessage{};
    }

    if (column == nullptr) {
        set_error(out_error, "The column argument is null.");
        return sai_status_invalid_argument;
    }
    if (out_counts == nullptr) {
        set_error(out_error, "The out_counts argument is null.");
        return sai_status_invalid_argument;
    }

    try {
        const NumericColumnView view = to_view(*column);
        sai::core::validate(view);
        *out_counts = SaiColumnCounts{view.size(), count_valid(view)};
        return sai_status_ok;
    } catch (const std::invalid_argument& error) {
        set_error(out_error, error.what());
        return sai_status_invalid_argument;
    } catch (const std::bad_alloc&) {
        // Composing a message would allocate again.
        return sai_status_out_of_memory;
    } catch (const std::exception& error) {
        set_error(out_error, error.what());
        return sai_status_unknown;
    } catch (...) {
        set_error(out_error, "The engine threw an object that is not a std::exception.");
        return sai_status_unknown;
    }
}

SaiStatus sai_describe(const SaiNumericColumn* column, const SaiDescriptiveOptions* options,
                       SaiDescriptiveResult* out_result, SaiErrorMessage* out_error) noexcept {
    if (out_error != nullptr) {
        *out_error = SaiErrorMessage{};
    }

    if (column == nullptr) {
        set_error(out_error, "The column argument is null.");
        return sai_status_invalid_argument;
    }
    if (out_result == nullptr) {
        set_error(out_error, "The out_result argument is null.");
        return sai_status_invalid_argument;
    }

    try {
        const DescriptiveResult result =
            sai::analysis::describe(to_view(*column), from_c(options));
        if (!to_c(result, *out_result)) {
            set_error(out_error, "The engine produced more diagnostics than a result can hold.");
            return sai_status_unknown;
        }
        return sai_status_ok;
    } catch (const std::invalid_argument& error) {
        set_error(out_error, error.what());
        return sai_status_invalid_argument;
    } catch (const std::bad_alloc&) {
        return sai_status_out_of_memory;
    } catch (const std::exception& error) {
        set_error(out_error, error.what());
        return sai_status_unknown;
    } catch (...) {
        set_error(out_error, "The engine threw an object that is not a std::exception.");
        return sai_status_unknown;
    }
}

void sai_error_message_destroy(SaiErrorMessage* message) noexcept {
    if (message == nullptr) {
        return;
    }
    delete[] message->data;
    *message = SaiErrorMessage{};
}

const char* sai_engine_version() noexcept {
    return sai_engine_version_text;
}

}  // extern "C"
