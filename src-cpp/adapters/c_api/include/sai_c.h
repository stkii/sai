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
// value_count and each element is 0 for a present row or 1 for a missing one.
// name may be null and need not be null terminated.
struct SaiNumericColumn {
    const double* values;
    std::size_t value_count;
    const std::uint8_t* missing_mask;
    std::size_t missing_mask_count;
    const char* name;
    std::size_t name_length;
};

// Why a value the caller asked for is absent. target is a static string owned
// by the engine and is never released.
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

// A statistic the engine did not produce. present is 0 and value must not be
// read: a caller that substitutes zero reports a result nobody computed.
struct SaiOptionalDouble {
    double value;
    std::uint8_t present;
};

// Each flag is independent, and 0 means the caller did not ask for that
// statistic rather than that the engine could not produce it.
struct SaiDescriptiveOptions {
    std::uint8_t include_skewness;
    std::uint8_t include_kurtosis;
};

// One per statistic below, because a value is explained at most once. Fixed so
// that a result crosses without an allocation and needs no release.
inline constexpr std::size_t sai_descriptive_diagnostic_capacity = 7;

struct SaiDescriptiveResult {
    std::size_t total_count;
    std::size_t valid_count;
    std::size_t missing_count;

    SaiOptionalDouble mean;
    SaiOptionalDouble standard_deviation;
    SaiOptionalDouble minimum;
    SaiOptionalDouble median;
    SaiOptionalDouble maximum;
    SaiOptionalDouble skewness;
    SaiOptionalDouble kurtosis;

    // What the engine ran with, which a caller that sent no options reads to
    // learn the defaults.
    SaiDescriptiveOptions applied_options;

    SaiDiagnostic diagnostics[sai_descriptive_diagnostic_capacity];
    std::size_t diagnostic_count;
};

// out_error may be null, and must not already hold a message: this overwrites
// it without releasing. out_counts is written only on success.
SaiStatus sai_numeric_column_counts(const SaiNumericColumn* column,
                                    SaiColumnCounts* out_counts,
                                    SaiErrorMessage* out_error) noexcept;

// Statistics for one column. options may be null, which asks for neither shape
// statistic. out_result is written only on success and is overwritten whole, so
// a reused structure carries nothing from an earlier call.
//
// An empty, all-missing or constant column is accepted: it is data, not a
// broken call, and the diagnostics say which statistics it has no value for.
SaiStatus sai_describe(const SaiNumericColumn* column, const SaiDescriptiveOptions* options,
                       SaiDescriptiveResult* out_result, SaiErrorMessage* out_error) noexcept;

// Idempotent, and safe to call with null.
void sai_error_message_destroy(SaiErrorMessage* message) noexcept;

// Which build of the engine produced a result, as a static null terminated
// string that is never released. Recorded with the result so a stored one can
// be told apart from a value this engine would produce today.
const char* sai_engine_version() noexcept;

}  // extern "C"
