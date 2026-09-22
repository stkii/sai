#include "sai/core/data_view.hpp"

#include <cmath>
#include <cstddef>
#include <cstdint>
#include <span>
#include <stdexcept>
#include <string>
#include <string_view>

#include "core/message.hpp"

namespace sai::core {
namespace {

// Used mid-sentence, so named and unnamed columns read the same way.
[[nodiscard]] std::string describe_column(std::string_view name) {
    if (name.empty()) {
        return "the column";
    }
    return detail::format_message("column \"{}\"", name);
}

// Messages carry the row the user sees, which is one based.
[[nodiscard]] std::size_t display_row(std::size_t row_index) noexcept {
    return row_index + 1;
}

}  // namespace

void validate(const NumericColumnView& column) {
    const std::span<const double> values = column.values;
    const std::span<const std::uint8_t> mask = column.missing_mask;
    const bool has_mask = !mask.empty();

    if (has_mask && mask.size() != values.size()) {
        throw std::invalid_argument(detail::format_message(
            "The values and the missing mask of {} differ in length: {} and {}.",
            describe_column(column.name), values.size(), mask.size()));
    }

    for (std::size_t row_index = 0; row_index < values.size(); ++row_index) {
        if (has_mask) {
            const std::uint8_t flag = mask[row_index];
            if (flag != missing_mask_present && flag != missing_mask_missing) {
                throw std::invalid_argument(detail::format_message(
                    "Row {} of {} has a missing mask value of {}; each element must be 0 or 1.",
                    display_row(row_index), describe_column(column.name),
                    // std::uint8_t would format as a single character.
                    std::uint32_t{flag}));
            }
            if (flag == missing_mask_missing) {
                continue;
            }
        }

        if (!std::isfinite(values[row_index])) {
            throw std::invalid_argument(detail::format_message(
                "Row {} of {} holds {}; rows not marked missing must hold a finite value.",
                display_row(row_index), describe_column(column.name),
                detail::format_number(values[row_index])));
        }
    }
}

}  // namespace sai::core
