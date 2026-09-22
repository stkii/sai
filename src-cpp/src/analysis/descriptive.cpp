#include "sai/analysis/descriptive.hpp"

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <initializer_list>
#include <string_view>
#include <vector>

#include "sai/core/data_view.hpp"
#include "sai/core/diagnostic.hpp"

namespace sai::analysis {
namespace {

using core::Diagnostic;
using core::DiagnosticCode;
using core::NumericColumnView;

// The valid observations a statistic needs before it has a definition. A
// single value is its own mean, minimum, median and maximum; a spread needs
// two; the bias corrections of skewness and kurtosis divide by (n - 2) and by
// (n - 2)(n - 3).
constexpr std::size_t minimum_observations = 1;
constexpr std::size_t minimum_spread_observations = 2;
constexpr std::size_t minimum_skewness_observations = 3;
constexpr std::size_t minimum_kurtosis_observations = 4;

// IBM SPSS Statistics Algorithms v32, DESCRIPTIVES Algorithms (PDF pp. 364-366)
// leaves out skewness and kurtosis when the sample variance is below 1e-20.
// Held as its square root so the test can be made without forming a variance,
// which for a large or small standard deviation does not survive squaring.
constexpr double minimum_shape_standard_deviation = 1e-10;

// A diagnostic names the result field that stayed empty, so these have to keep
// matching the member names in the header.
constexpr std::string_view mean_target = "mean";
constexpr std::string_view standard_deviation_target = "standard_deviation";
constexpr std::string_view minimum_target = "minimum";
constexpr std::string_view median_target = "median";
constexpr std::string_view maximum_target = "maximum";
constexpr std::string_view skewness_target = "skewness";
constexpr std::string_view kurtosis_target = "kurtosis";

void report(DescriptiveResult& result, DiagnosticCode code, std::string_view target) {
    result.diagnostics.push_back(Diagnostic{code, target, result.valid_count});
}

// The average of two finite values, formed so that neither the sum nor the
// difference leaves the representable range: two values of the same sign
// cannot overflow when subtracted, and two of opposite signs cannot be added
// once each has been halved.
[[nodiscard]] double midpoint(double lower, double upper) noexcept {
    if (std::signbit(lower) == std::signbit(upper)) {
        return lower + ((upper - lower) / 2.0);
    }
    return (lower / 2.0) + (upper / 2.0);
}

// The missing rows are dropped rather than skipped later, because the median
// orders its input and the borrowed column has to come back untouched.
[[nodiscard]] std::vector<double> valid_values_of(const NumericColumnView& column) {
    std::vector<double> values;
    values.reserve(column.size());
    for (std::size_t row_index = 0; row_index < column.size(); ++row_index) {
        if (!column.is_missing(row_index)) {
            values.push_back(column.values[row_index]);
        }
    }
    return values;
}

// The provisional mean of IBM SPSS Statistics Algorithms v32, DESCRIPTIVES
// Algorithms (PDF pp. 364-365) with every weight 1. Each step is a weighted
// average of the previous mean and the new value, so every intermediate stays
// between the smallest and largest value seen; a running total would leave the
// representable range long before the mean does.
//
// Requires a non-empty vector of finite values.
[[nodiscard]] double mean_of(const std::vector<double>& values) noexcept {
    double mean = values.front();
    for (std::size_t index = 1; index < values.size(); ++index) {
        const double value = values[index];
        const double weight = static_cast<double>(index + 1);
        if (std::signbit(value) == std::signbit(mean)) {
            mean += (value - mean) / weight;
        } else {
            // value - mean would overflow for large values of opposite signs.
            // This is the same weighted average without that subtraction.
            mean = (mean * ((weight - 1.0) / weight)) + (value / weight);
        }
    }
    return mean;
}

// The sums M_r = sum (x_i - mean)^r that skewness and kurtosis are built from.
struct CentralMoments {
    double m2{};
    double m3{};
    double m4{};
};

// The moments of the values after x -> (x - center) / scale, which is a change
// of origin and of unit only. Skewness and kurtosis are ratios of a moment to
// a matching power of the standard deviation, so the unit cancels and they are
// read off these sums directly; the standard deviation carries the unit and is
// multiplied back by scale, and the variance cutoff is applied on the original
// scale.
//
// Requires scale > 0. The update of a moment reads the lower ones as they
// stood before this observation, hence m4 before m3 before m2. The recurrence
// is the one the SPSS algorithm gives for the weighted case with every weight 1.
[[nodiscard]] CentralMoments central_moments_of(const std::vector<double>& values, double center,
                                                double scale,
                                                const DescriptiveOptions& options) noexcept {
    CentralMoments moments;
    double mean = 0.0;
    std::size_t count = 0;
    for (const double original : values) {
        const double value = (original - center) / scale;
        const double weight = static_cast<double>(++count);
        const double deviation = value - mean;
        const double step = deviation / weight;
        const double m2_increment = deviation * step * (weight - 1.0);

        if (options.include_kurtosis) {
            moments.m4 += (m2_increment * step * step
                           * ((weight * weight) - (3.0 * weight) + 3.0))
                          + (6.0 * step * step * moments.m2) - (4.0 * step * moments.m3);
        }
        if (options.include_skewness || options.include_kurtosis) {
            moments.m3 += (m2_increment * step * (weight - 2.0)) - (3.0 * step * moments.m2);
        }
        moments.m2 += m2_increment;
        mean += step;
    }
    return moments;
}

// Orders its argument, which is why it takes the working copy and not the
// column. Only the middle is placed, so the cost stays linear.
[[nodiscard]] double median_of(std::vector<double>& values) noexcept {
    const std::size_t count = values.size();
    const auto upper = values.begin() + static_cast<std::ptrdiff_t>(count / 2);
    std::nth_element(values.begin(), upper, values.end());
    if (count % 2 != 0) {
        return *upper;
    }
    return midpoint(*std::max_element(values.begin(), upper), *upper);
}

// Which statistics the caller asked for and the sample size allows. A
// statistic ruled out here already has its diagnostic and must not be given a
// second one further down.
struct Pending {
    bool standard_deviation{};
    bool skewness{};
    bool kurtosis{};
};

[[nodiscard]] Pending pending_of(const DescriptiveResult& result) noexcept {
    const std::size_t count = result.valid_count;
    const DescriptiveOptions& options = result.applied_options;
    return Pending{
        count >= minimum_spread_observations,
        options.include_skewness && count >= minimum_skewness_observations,
        options.include_kurtosis && count >= minimum_kurtosis_observations,
    };
}

// Ordered by the number of observations each statistic needs, so the least
// demanding one is reported first.
void report_short_column(DescriptiveResult& result) {
    const std::size_t count = result.valid_count;
    const DescriptiveOptions& options = result.applied_options;

    if (count < minimum_observations) {
        for (const std::string_view target :
             {mean_target, minimum_target, median_target, maximum_target}) {
            report(result, DiagnosticCode::InsufficientObservations, target);
        }
    }
    if (count < minimum_spread_observations) {
        report(result, DiagnosticCode::InsufficientObservations, standard_deviation_target);
    }
    if (options.include_skewness && count < minimum_skewness_observations) {
        report(result, DiagnosticCode::InsufficientObservations, skewness_target);
    }
    if (options.include_kurtosis && count < minimum_kurtosis_observations) {
        report(result, DiagnosticCode::InsufficientObservations, kurtosis_target);
    }
}

// Everything the mean feeds, when the mean itself could not be represented.
void report_without_a_mean(DescriptiveResult& result, const Pending& pending) {
    if (pending.standard_deviation) {
        report(result, DiagnosticCode::NotRepresentable, standard_deviation_target);
    }
    if (pending.skewness) {
        report(result, DiagnosticCode::NotRepresentable, skewness_target);
    }
    if (pending.kurtosis) {
        report(result, DiagnosticCode::NotRepresentable, kurtosis_target);
    }
}

void report_shape(DescriptiveResult& result, const Pending& pending, DiagnosticCode code) {
    if (pending.skewness) {
        report(result, code, skewness_target);
    }
    if (pending.kurtosis) {
        report(result, code, kurtosis_target);
    }
}

// The moments and the standard deviation are both on the normalized scale,
// where the unit of the ratios below cancels.
void assign_shape(DescriptiveResult& result, const Pending& pending,
                  const CentralMoments& moments, double normalized) {
    const double count = static_cast<double>(result.valid_count);
    const double variance = normalized * normalized;
    if (pending.skewness) {
        result.skewness =
            (count * moments.m3) / ((count - 1.0) * (count - 2.0) * variance * normalized);
    }
    if (pending.kurtosis) {
        result.kurtosis =
            ((count * (count + 1.0) * moments.m4)
             / ((count - 1.0) * (count - 2.0) * (count - 3.0) * variance * variance))
            - ((3.0 * (count - 1.0) * (count - 1.0)) / ((count - 2.0) * (count - 3.0)));
    }
}

// Requires a minimum and a maximum.
void describe_spread(DescriptiveResult& result, const std::vector<double>& values,
                     const Pending& pending) {
    // Nothing below is defined for one value, and a pending shape statistic
    // needs more still, so this leaves no statistic unanswered.
    if (!pending.standard_deviation) {
        return;
    }

    // Centring on the midpoint of the range keeps small variation that sits on
    // a large offset; dividing by the largest deviation puts the minimum at -1
    // and the maximum at +1, so no power of a deviation can overflow.
    const double center = midpoint(*result.minimum, *result.maximum);
    const double scale = std::max(*result.maximum - center, center - *result.minimum);
    const CentralMoments moments =
        scale > 0.0 ? central_moments_of(values, center, scale, result.applied_options)
                    : CentralMoments{};

    const double count = static_cast<double>(result.valid_count);
    const double normalized = std::sqrt(moments.m2 / (count - 1.0));
    const double standard_deviation = normalized * scale;

    // The extremes normalize to -1 and +1, so a normalized deviation of zero
    // means every value is the same rather than a sum that lost its digits.
    // That is the one case where a standard deviation of zero is the answer
    // and not an underflow.
    const bool is_constant = !(normalized > 0.0);
    const bool is_representable =
        std::isfinite(standard_deviation) && (standard_deviation > 0.0 || is_constant);

    if (!is_representable) {
        report(result, DiagnosticCode::NotRepresentable, standard_deviation_target);
        report_shape(result, pending, DiagnosticCode::NotRepresentable);
        return;
    }
    result.standard_deviation = standard_deviation;

    // s < 1e-10 without forming s: s is normalized * scale, so the cutoff is
    // scale < 1e-10 / normalized. A normalized value small enough to make that
    // quotient infinite leaves the comparison true, which is the intent.
    if (is_constant || scale < (minimum_shape_standard_deviation / normalized)) {
        report_shape(result, pending, DiagnosticCode::VarianceTooSmall);
        return;
    }
    assign_shape(result, pending, moments, normalized);
}

}  // namespace

DescriptiveResult describe(const core::NumericColumnView& column,
                           const DescriptiveOptions& options) {
    core::validate(column);

    DescriptiveResult result;
    result.total_count = column.size();
    result.applied_options = options;

    std::vector<double> values = valid_values_of(column);
    result.valid_count = values.size();
    result.missing_count = result.total_count - result.valid_count;

    report_short_column(result);
    if (values.empty()) {
        return result;
    }

    const auto [smallest, largest] = std::minmax_element(values.begin(), values.end());
    result.minimum = *smallest;
    result.maximum = *largest;

    const Pending pending = pending_of(result);
    const double mean = mean_of(values);
    if (std::isfinite(mean)) {
        result.mean = mean;
        // Before median_of, which reorders the working copy: a sum in floating
        // point depends on the order of its terms, and the stored reference
        // values were produced in the order the column is read.
        describe_spread(result, values, pending);
    } else {
        // The provisional mean above keeps every intermediate between the
        // smallest and largest input, so finite values are not expected to
        // reach this. It stands because the result contract is that an absent
        // value always carries a reason.
        report(result, DiagnosticCode::NotRepresentable, mean_target);
        report_without_a_mean(result, pending);
    }

    result.median = median_of(values);
    return result;
}

}  // namespace sai::analysis
