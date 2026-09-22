#include "sai/analysis/descriptive.hpp"

#include <gtest/gtest.h>

#include <array>
#include <bit>
#include <cstdint>
#include <limits>
#include <span>
#include <stdexcept>
#include <tuple>
#include <vector>

#include "sai/core/data_view.hpp"
#include "sai/core/diagnostic.hpp"
#include "sai/core/missing.hpp"
#include "support/tolerance.hpp"

namespace {

using sai::analysis::describe;
using sai::analysis::DescriptiveOptions;
using sai::analysis::DescriptiveResult;
using sai::core::Diagnostic;
using sai::core::DiagnosticCode;
using sai::core::missing_mask_missing;
using sai::core::missing_mask_present;
using sai::core::NumericColumnView;
using sai::test::is_near;

using Diagnostics = std::vector<Diagnostic>;

constexpr DescriptiveOptions both_shapes{.include_skewness = true, .include_kurtosis = true};

// Compared as bits rather than as numbers, so a missing row's placeholder is
// covered too and no tolerance can stand between the two. Reading the doubles
// back with == would need -Wfloat-equal suppressed and would still call a NaN
// placeholder different from itself.
[[nodiscard]] std::vector<std::uint64_t> bits_of(std::span<const double> values) {
    std::vector<std::uint64_t> bits;
    bits.reserve(values.size());
    for (const double value : values) {
        bits.push_back(std::bit_cast<std::uint64_t>(value));
    }
    return bits;
}

TEST(Describe, SplitsEveryRowIntoAValidOneOrAMissingOne) {
    const std::array<double, 4> values{1.0, 2.0, 3.0, 4.0};
    const std::array<std::uint8_t, 4> mask{missing_mask_present, missing_mask_missing,
                                           missing_mask_present, missing_mask_missing};

    const DescriptiveResult result = describe(NumericColumnView{values, mask, "score"});

    EXPECT_EQ(result.total_count, 4U);
    EXPECT_EQ(result.valid_count, 2U);
    EXPECT_EQ(result.missing_count, 2U);
    EXPECT_EQ(result.total_count, result.valid_count + result.missing_count);
}

TEST(Describe, MatchesTheValuesOfAHandCheckedSample) {
    const std::array<double, 5> values{1.0, 2.0, 3.0, 4.0, 5.0};

    const DescriptiveResult result = describe(NumericColumnView{values, {}, "score"}, both_shapes);

    EXPECT_TRUE(is_near(*result.mean, 3.0));
    EXPECT_TRUE(is_near(*result.standard_deviation, 1.5811388300841898));
    EXPECT_TRUE(is_near(*result.minimum, 1.0));
    EXPECT_TRUE(is_near(*result.median, 3.0));
    EXPECT_TRUE(is_near(*result.maximum, 5.0));
    EXPECT_TRUE(is_near(*result.skewness, 0.0));
    EXPECT_TRUE(is_near(*result.kurtosis, -1.2));
    EXPECT_EQ(result.diagnostics, Diagnostics{});
}

TEST(Describe, ReturnsNoStatisticForAnEmptyColumn) {
    const DescriptiveResult result = describe(NumericColumnView{});

    EXPECT_EQ(result.total_count, 0U);
    EXPECT_FALSE(result.mean.has_value());
    EXPECT_FALSE(result.standard_deviation.has_value());
    EXPECT_FALSE(result.minimum.has_value());
    EXPECT_FALSE(result.median.has_value());
    EXPECT_FALSE(result.maximum.has_value());
    EXPECT_EQ(result.diagnostics,
              (Diagnostics{
                  {DiagnosticCode::InsufficientObservations, "mean", 0},
                  {DiagnosticCode::InsufficientObservations, "minimum", 0},
                  {DiagnosticCode::InsufficientObservations, "median", 0},
                  {DiagnosticCode::InsufficientObservations, "maximum", 0},
                  {DiagnosticCode::InsufficientObservations, "standard_deviation", 0},
              }));
}

TEST(Describe, TreatsAnAllMissingColumnAsAnEmptyOne) {
    const std::array<double, 2> values{1.0, 2.0};
    const std::array<std::uint8_t, 2> mask{missing_mask_missing, missing_mask_missing};

    const DescriptiveResult result = describe(NumericColumnView{values, mask, "score"});

    EXPECT_EQ(result.valid_count, 0U);
    EXPECT_EQ(result.missing_count, 2U);
    EXPECT_FALSE(result.mean.has_value());
    EXPECT_EQ(result.diagnostics.size(), 5U);
}

TEST(Describe, IgnoresWhateverAMissingRowHolds) {
    // A row marked missing holds a placeholder the engine never reads, so it
    // does not have to be finite.
    const std::array<double, 3> values{1.0, std::numeric_limits<double>::infinity(), 3.0};
    const std::array<std::uint8_t, 3> mask{missing_mask_present, missing_mask_missing,
                                           missing_mask_present};

    const DescriptiveResult result = describe(NumericColumnView{values, mask, "score"});

    EXPECT_EQ(result.valid_count, 2U);
    EXPECT_TRUE(is_near(*result.mean, 2.0));
    EXPECT_TRUE(is_near(*result.maximum, 3.0));
}

TEST(Describe, TakesOneValueAsItsOwnMeanMinimumMedianAndMaximum) {
    const std::array<double, 1> values{7.5};

    const DescriptiveResult result = describe(NumericColumnView{values, {}, "score"});

    EXPECT_TRUE(is_near(*result.mean, 7.5));
    EXPECT_TRUE(is_near(*result.minimum, 7.5));
    EXPECT_TRUE(is_near(*result.median, 7.5));
    EXPECT_TRUE(is_near(*result.maximum, 7.5));
    EXPECT_EQ(result.diagnostics,
              (Diagnostics{{DiagnosticCode::InsufficientObservations, "standard_deviation", 1}}));
}

TEST(Describe, NeedsTwoValuesForAStandardDeviation) {
    const std::array<double, 2> values{2.0, 4.0};

    const DescriptiveResult result = describe(NumericColumnView{values, {}, "score"});

    EXPECT_TRUE(is_near(*result.standard_deviation, 1.4142135623730951));
    EXPECT_EQ(result.diagnostics, Diagnostics{});
}

TEST(Describe, NeedsThreeValuesForASkewness) {
    const std::array<double, 3> values{1.0, 2.0, 6.0};
    const DescriptiveOptions options{.include_skewness = true};

    const DescriptiveResult two = describe(NumericColumnView{std::span{values}.first(2), {}, "s"},
                                           options);
    const DescriptiveResult three = describe(NumericColumnView{values, {}, "s"}, options);

    EXPECT_FALSE(two.skewness.has_value());
    EXPECT_EQ(two.diagnostics,
              (Diagnostics{{DiagnosticCode::InsufficientObservations, "skewness", 2}}));
    EXPECT_TRUE(is_near(*three.skewness, 1.4578629673213048));
    EXPECT_EQ(three.diagnostics, Diagnostics{});
}

TEST(Describe, NeedsFourValuesForAKurtosis) {
    const std::array<double, 4> values{1.0, 2.0, 6.0, 7.0};
    const DescriptiveOptions options{.include_kurtosis = true};

    const DescriptiveResult three = describe(NumericColumnView{std::span{values}.first(3), {}, "s"},
                                             options);
    const DescriptiveResult four = describe(NumericColumnView{values, {}, "s"}, options);

    EXPECT_FALSE(three.kurtosis.has_value());
    EXPECT_EQ(three.diagnostics,
              (Diagnostics{{DiagnosticCode::InsufficientObservations, "kurtosis", 3}}));
    EXPECT_TRUE(is_near(*four.kurtosis, -4.8905325443786971));
    EXPECT_EQ(four.diagnostics, Diagnostics{});
}

TEST(Describe, GivesAConstantColumnNoShapeButAStandardDeviationOfZero) {
    const std::array<double, 4> values{2.5, 2.5, 2.5, 2.5};

    const DescriptiveResult result = describe(NumericColumnView{values, {}, "score"}, both_shapes);

    EXPECT_TRUE(is_near(*result.standard_deviation, 0.0));
    EXPECT_TRUE(is_near(*result.mean, 2.5));
    EXPECT_FALSE(result.skewness.has_value());
    EXPECT_FALSE(result.kurtosis.has_value());
    EXPECT_EQ(result.diagnostics, (Diagnostics{
                                      {DiagnosticCode::VarianceTooSmall, "skewness", 4},
                                      {DiagnosticCode::VarianceTooSmall, "kurtosis", 4},
                                  }));
}

TEST(Describe, WithholdsTheShapeStatisticsOfAVarianceBelowTheCutoff) {
    // A sample variance of 1.3e-21, under the 1e-20 the SPSS algorithm asks
    // for, while the standard deviation itself is still returned.
    const double half_step = 3.1622776601683794e-11;
    const std::array<double, 4> values{1.0 - half_step, 1.0 - half_step, 1.0 + half_step,
                                       1.0 + half_step};

    const DescriptiveResult result = describe(NumericColumnView{values, {}, "score"}, both_shapes);

    EXPECT_TRUE(result.standard_deviation.has_value());
    EXPECT_EQ(result.diagnostics, (Diagnostics{
                                      {DiagnosticCode::VarianceTooSmall, "skewness", 4},
                                      {DiagnosticCode::VarianceTooSmall, "kurtosis", 4},
                                  }));
}

TEST(Describe, LeavesAStatisticNobodyAskedForWithoutADiagnostic) {
    const std::array<double, 2> values{1.0, 2.0};

    const DescriptiveResult result = describe(NumericColumnView{values, {}, "score"});

    EXPECT_FALSE(result.skewness.has_value());
    EXPECT_FALSE(result.kurtosis.has_value());
    EXPECT_EQ(result.diagnostics, Diagnostics{});
}

TEST(Describe, ProducesEachShapeStatisticWithoutTheOther) {
    const std::array<double, 5> values{1.0, 2.0, 3.0, 4.0, 9.0};
    const NumericColumnView column{values, {}, "score"};

    const DescriptiveResult only_skewness =
        describe(column, DescriptiveOptions{.include_skewness = true});
    const DescriptiveResult only_kurtosis =
        describe(column, DescriptiveOptions{.include_kurtosis = true});
    const DescriptiveResult both = describe(column, both_shapes);

    EXPECT_TRUE(only_skewness.skewness.has_value());
    EXPECT_FALSE(only_skewness.kurtosis.has_value());
    EXPECT_FALSE(only_kurtosis.skewness.has_value());
    EXPECT_TRUE(only_kurtosis.kurtosis.has_value());
    // Switching one on must not move the other, so the shared moments cannot
    // be accumulated differently depending on what was asked for.
    EXPECT_TRUE(is_near(*only_skewness.skewness, *both.skewness));
    EXPECT_TRUE(is_near(*only_kurtosis.kurtosis, *both.kurtosis));
}

TEST(Describe, EchoesTheOptionsItApplied) {
    const std::array<double, 1> values{1.0};

    const DescriptiveResult result =
        describe(NumericColumnView{values, {}, "score"},
                 DescriptiveOptions{.include_skewness = true, .include_kurtosis = false});

    EXPECT_TRUE(result.applied_options.include_skewness);
    EXPECT_FALSE(result.applied_options.include_kurtosis);
}

TEST(Describe, TakesTheMiddleValueOfAnOddNumberOfRows) {
    const std::array<double, 5> values{9.0, 1.0, 7.0, 3.0, 5.0};

    EXPECT_TRUE(is_near(*describe(NumericColumnView{values, {}, "score"}).median, 5.0));
}

TEST(Describe, AveragesTheTwoCentralValuesOfAnEvenNumberOfRows) {
    const std::array<double, 4> values{9.0, 1.0, 4.0, 3.0};

    EXPECT_TRUE(is_near(*describe(NumericColumnView{values, {}, "score"}).median, 3.5));
}

TEST(Describe, KeepsTheColumnItWasGiven) {
    // Deliberately unordered and with a missing row, so both the ordering the
    // median needs and the skipping of a missing row would show up here.
    const std::array<double, 5> values{9.0, 1.0, 4.0, 3.0, 5.0};
    const std::array<std::uint8_t, 5> mask{missing_mask_present, missing_mask_present,
                                           missing_mask_missing, missing_mask_present,
                                           missing_mask_present};
    const std::vector<std::uint64_t> before = bits_of(values);

    std::ignore = describe(NumericColumnView{values, mask, "score"}, both_shapes);

    EXPECT_EQ(bits_of(values), before);
}

TEST(Describe, RejectsAColumnThatBreaksTheInputContract) {
    const std::array<double, 3> values{1.0, 2.0, 3.0};
    const std::array<std::uint8_t, 2> mask{missing_mask_present, missing_mask_present};

    EXPECT_THROW(std::ignore = describe(NumericColumnView{values, mask, "score"}),
                 std::invalid_argument);
}

TEST(Describe, AveragesValuesWhoseSumWouldLeaveTheRepresentableRange) {
    const std::array<double, 2> same_sign{1.6e308, 1.7e308};
    const std::array<double, 2> opposite_signs{-1.7e308, 1.7e308};

    EXPECT_TRUE(is_near(*describe(NumericColumnView{same_sign, {}, "score"}).mean, 1.65e308));
    EXPECT_TRUE(is_near(*describe(NumericColumnView{opposite_signs, {}, "score"}).mean, 0.0));
}

TEST(Describe, ReportsAStandardDeviationThatLeavesTheRepresentableRange) {
    const std::array<double, 2> values{-1.7e308, 1.7e308};

    const DescriptiveResult result = describe(NumericColumnView{values, {}, "score"});

    EXPECT_FALSE(result.standard_deviation.has_value());
    EXPECT_EQ(result.diagnostics,
              (Diagnostics{{DiagnosticCode::NotRepresentable, "standard_deviation", 2}}));
    // The statistics that do not go through the standard deviation are kept.
    EXPECT_TRUE(is_near(*result.minimum, -1.7e308));
    EXPECT_TRUE(is_near(*result.maximum, 1.7e308));
    EXPECT_TRUE(is_near(*result.median, 0.0));
}

TEST(Describe, WithholdsTheShapeStatisticsOfAnUnrepresentableStandardDeviation) {
    const std::array<double, 4> values{-1.7e308, -1.7e308, 1.7e308, 1.7e308};

    const DescriptiveResult result = describe(NumericColumnView{values, {}, "score"}, both_shapes);

    EXPECT_FALSE(result.standard_deviation.has_value());
    EXPECT_EQ(result.diagnostics,
              (Diagnostics{
                  {DiagnosticCode::NotRepresentable, "standard_deviation", 4},
                  {DiagnosticCode::NotRepresentable, "skewness", 4},
                  {DiagnosticCode::NotRepresentable, "kurtosis", 4},
              }));
}

}  // namespace
