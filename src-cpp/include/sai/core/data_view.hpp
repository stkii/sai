#pragma once

#include <cstddef>
#include <cstdint>
#include <span>
#include <string_view>

#include "sai/core/missing.hpp"

namespace sai::core {

// A borrowed view of one numeric column. Owns nothing: the caller keeps the
// buffers alive for the call, and the engine holds no reference afterwards.
//
// Each member becomes a pointer and a length at the C boundary. std::span and
// std::string_view have no specified layout, so the adapter converts field by
// field; tests/unit/c_compatibility_test.cpp holds that conversion.
struct NumericColumnView {
    std::span<const double> values;

    // Empty means no row is missing, which spares the caller an all-zero array.
    // Otherwise its length equals values.size().
    std::span<const std::uint8_t> missing_mask;

    // Empty when the caller has no name; messages then say "the column".
    std::string_view name;

    [[nodiscard]] std::size_t size() const noexcept { return values.size(); }

    // Requires row_index < size() and a column validate() accepted.
    [[nodiscard]] bool is_missing(std::size_t row_index) const noexcept {
        return !missing_mask.empty() && missing_mask[row_index] == missing_mask_missing;
    }
};

// Checks the mask length, the mask values, and that rows not marked missing
// hold a finite value. Throws std::invalid_argument for the first violation in
// row order.
//
// Costs one pass. A public API function calls this once on entry; constructing
// a view does not, so splitting a column into groups does not rescan it.
void validate(const NumericColumnView& column);

}  // namespace sai::core
