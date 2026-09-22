#pragma once

#include <cstddef>
#include <cstdint>
#include <string_view>

namespace sai::core {

// Shared by every method rather than declared per method, so adding a method
// does not force Rust and the GUI to extend an exhaustive match. A contract
// violation is an exception, not a diagnostic; see docs/NUMERICAL_POLICY.md.
//
// The values cross the C boundary and never change. Zero is unused, so a
// zero-filled struct is recognisable as one nobody filled in.
enum class DiagnosticCode : std::int32_t {
    InsufficientObservations = 1,
    VarianceTooSmall = 2,
    NotRepresentable = 3,
};

// Carries no display text: the GUI builds the sentence from code and target.
struct Diagnostic {
    DiagnosticCode code{};

    // Which value is missing, as a stable snake_case key matching the field
    // name in the method's result. A string literal rather than an enumerator,
    // so a new key costs no branch in Rust or the GUI and needs no owner at the
    // C boundary.
    std::string_view target;

    // For every code above, the number of valid observations the method used.
    std::size_t count{};

    friend bool operator==(const Diagnostic&, const Diagnostic&) = default;
};

}  // namespace sai::core
