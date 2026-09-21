#pragma once

#include <cstdint>

namespace sai::core {

// Fixed by the C boundary contract: the caller fills the mask array.
inline constexpr std::uint8_t missing_mask_present = 0;
inline constexpr std::uint8_t missing_mask_missing = 1;

// The value stored at a missing row is a placeholder and is never read, so it
// need not be finite. Listwise and pairwise exclusion belong to the first
// method that offers the choice; a single column has only one behaviour.

}  // namespace sai::core
