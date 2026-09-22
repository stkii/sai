#pragma once

#include <cstddef>
#include <optional>
#include <vector>

#include "sai/core/data_view.hpp"
#include "sai/core/diagnostic.hpp"

namespace sai::analysis {

// The two shape statistics are independent: asking for one does not compute
// the other. Everything else is always produced.
struct DescriptiveOptions {
    bool include_skewness = false;
    bool include_kurtosis = false;
};

// Unweighted descriptive statistics for one numeric column.
//
// An empty optional means the value was not produced, never a numeric zero.
// A value the caller asked for and did not get is explained by a diagnostic
// whose target is the field name; a value the options switched off carries
// none. An empty diagnostics vector therefore means every requested value is
// present.
struct DescriptiveResult {
    // total_count == valid_count + missing_count.
    std::size_t total_count{};
    std::size_t valid_count{};
    std::size_t missing_count{};

    std::optional<double> mean;

    // Sample standard deviation, denominator n - 1.
    std::optional<double> standard_deviation;

    std::optional<double> minimum;
    std::optional<double> median;
    std::optional<double> maximum;

    // Bias corrected, and excess in the case of kurtosis, so a normal
    // distribution gives zero for both.
    std::optional<double> skewness;
    std::optional<double> kurtosis;

    DescriptiveOptions applied_options;
    std::vector<core::Diagnostic> diagnostics;
};

// Borrows the column for the call and leaves it unchanged, the ordering the
// median needs being done on a copy.
//
// Throws std::invalid_argument for the contract violations sai::core::validate
// names. Data that merely yields no statistic, such as an empty, all-missing
// or constant column, is accepted and answered with diagnostics.
[[nodiscard]] DescriptiveResult describe(const core::NumericColumnView& column,
                                         const DescriptiveOptions& options = {});

}  // namespace sai::analysis
