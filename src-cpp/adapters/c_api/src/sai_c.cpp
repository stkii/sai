#include "sai_c.h"

#include <cstddef>
#include <exception>
#include <new>
#include <span>
#include <stdexcept>
#include <string_view>

#include "sai/core/data_view.hpp"

namespace {

using sai::core::NumericColumnView;

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

void sai_error_message_destroy(SaiErrorMessage* message) noexcept {
    if (message == nullptr) {
        return;
    }
    delete[] message->data;
    *message = SaiErrorMessage{};
}

}  // extern "C"
