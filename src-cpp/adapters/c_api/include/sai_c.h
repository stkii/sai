#pragma once

// C++ source declaring a C ABI, not a C includable header: CLAUDE.md rules out
// C standard library headers, and the only caller, crates/sai-engine/, restates
// these signatures in Rust.

#include <cstddef>
#include <cstdint>

// Not an enum: the C ABI leaves an enum's underlying type to the implementation.
using SaiStatus = std::int32_t;

// Zero, so a caller that only tests for nonzero is correct.
inline constexpr SaiStatus sai_status_ok = 0;

// The caller's code is wrong: a required pointer was null, or the column
// violates the contract in sai/core/data_view.hpp.
inline constexpr SaiStatus sai_status_invalid_argument = 1;

// Carries no message, because composing one would allocate again.
inline constexpr SaiStatus sai_status_out_of_memory = 2;

// A defect in the engine rather than in the call.
inline constexpr SaiStatus sai_status_unknown = 3;

extern "C" {

// Borrowed for the call: the engine does not write through these pointers and
// holds none of them after returning.
//
// A null missing_mask means no row is missing; otherwise its length equals
// value_count. name may be null and need not be null terminated.
struct SaiNumericColumn {
    const double* values;
    std::size_t value_count;
    const std::uint8_t* missing_mask;
    std::size_t missing_mask_count;
    const char* name;
    std::size_t name_length;
};

// No function returns one yet; the shape is fixed here because the boundary
// contract is. target is a static string and is never released.
struct SaiDiagnostic {
    std::int32_t code;
    const char* target;
    std::size_t target_length;
    std::size_t count;
};

// Released by the caller with sai_error_message_destroy. data is null
// terminated, or null when no message was produced; length excludes the
// terminator.
struct SaiErrorMessage {
    const char* data;
    std::size_t length;
};

struct SaiColumnCounts {
    std::size_t row_count;
    // Rows not marked missing.
    std::size_t valid_count;
};

// out_error may be null, and must not already hold a message: this overwrites
// it without releasing. out_counts is written only on success.
SaiStatus sai_numeric_column_counts(const SaiNumericColumn* column,
                                    SaiColumnCounts* out_counts,
                                    SaiErrorMessage* out_error) noexcept;

// Idempotent, and safe to call with null.
void sai_error_message_destroy(SaiErrorMessage* message) noexcept;

}  // extern "C"
