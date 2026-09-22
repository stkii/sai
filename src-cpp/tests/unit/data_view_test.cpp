#include "sai/core/data_view.hpp"

#include <gtest/gtest.h>

#include <array>
#include <cstdint>
#include <limits>
#include <stdexcept>
#include <string>
#include <vector>

#include "sai/core/missing.hpp"

namespace {

using sai::core::missing_mask_missing;
using sai::core::missing_mask_present;
using sai::core::NumericColumnView;

// The wording is part of the contract in docs/NUMERICAL_POLICY.md, so the tests
// below compare it whole.
[[nodiscard]] std::string rejection_message(const NumericColumnView& column) {
    try {
        sai::core::validate(column);
    } catch (const std::invalid_argument& error) {
        return error.what();
    }
    return {};
}

TEST(NumericColumnView, CountsMissingRowsInItsSize) {
    const std::array<double, 3> values{1.0, 2.0, 3.0};
    const std::array<std::uint8_t, 3> mask{
        missing_mask_present, missing_mask_missing, missing_mask_present};

    EXPECT_EQ((NumericColumnView{values, mask, "score"}).size(), 3U);
}

TEST(NumericColumnView, TreatsAnEmptyMaskAsNoMissingRow) {
    const std::array<double, 2> values{1.0, 2.0};
    const NumericColumnView column{values, {}, "score"};

    EXPECT_FALSE(column.is_missing(0));
    EXPECT_FALSE(column.is_missing(1));
}

TEST(NumericColumnView, ReadsTheMaskWhenOneIsGiven) {
    const std::array<double, 3> values{1.0, 2.0, 3.0};
    const std::array<std::uint8_t, 3> mask{
        missing_mask_present, missing_mask_missing, missing_mask_present};
    const NumericColumnView column{values, mask, "score"};

    EXPECT_FALSE(column.is_missing(0));
    EXPECT_TRUE(column.is_missing(1));
    EXPECT_FALSE(column.is_missing(2));
}

TEST(NumericColumnView, NarrowingTheSpansYieldsASubViewOfTheSameBuffer) {
    // How group-wise methods split a validated column: nothing is copied and
    // nothing is rescanned.
    const std::array<double, 4> values{1.0, 2.0, 3.0, 4.0};
    const std::array<std::uint8_t, 4> mask{
        missing_mask_present, missing_mask_missing, missing_mask_present,
        missing_mask_present};
    const NumericColumnView column{values, mask, "score"};

    const NumericColumnView tail{
        column.values.subspan(1), column.missing_mask.subspan(1), column.name};

    EXPECT_EQ(tail.size(), 3U);
    EXPECT_TRUE(tail.is_missing(0));
    EXPECT_EQ(tail.values.data(), column.values.data() + 1);
}

TEST(Validate, AcceptsAColumnWithoutAMask) {
    const std::array<double, 3> values{1.0, 2.0, 3.0};

    EXPECT_EQ(rejection_message(NumericColumnView{values, {}, "score"}), "");
}

TEST(Validate, AcceptsAnEmptyColumn) {
    // Normal user data, not a contract violation.
    EXPECT_EQ(rejection_message(NumericColumnView{}), "");
}

TEST(Validate, AcceptsAFullyMissingColumn) {
    const std::array<double, 2> values{0.0, 0.0};
    const std::array<std::uint8_t, 2> mask{missing_mask_missing, missing_mask_missing};

    EXPECT_EQ(rejection_message(NumericColumnView{values, mask, "score"}), "");
}

TEST(Validate, IgnoresThePlaceholderValueOnAMissingRow) {
    const std::array<double, 2> values{
        std::numeric_limits<double>::quiet_NaN(), 2.0};
    const std::array<std::uint8_t, 2> mask{missing_mask_missing, missing_mask_present};

    EXPECT_EQ(rejection_message(NumericColumnView{values, mask, "score"}), "");
}

TEST(Validate, RejectsAMaskWhoseLengthDiffersFromTheValues) {
    const std::array<double, 3> values{1.0, 2.0, 3.0};
    const std::array<std::uint8_t, 2> mask{missing_mask_present, missing_mask_present};

    EXPECT_EQ(rejection_message(NumericColumnView{values, mask, "age"}),
              "The values and the missing mask of column \"age\" differ in "
              "length: 3 and 2.");
}

TEST(Validate, RejectsAMaskElementThatIsNeitherZeroNorOne) {
    const std::array<double, 3> values{1.0, 2.0, 3.0};
    const std::array<std::uint8_t, 3> mask{
        missing_mask_present, missing_mask_present, 2};

    EXPECT_EQ(rejection_message(NumericColumnView{values, mask, "age"}),
              "Row 3 of column \"age\" has a missing mask value of 2; each "
              "element must be 0 or 1.");
}

TEST(Validate, RejectsANonFiniteValueOnARowThatIsNotMissing) {
    const std::array<double, 2> values{
        1.0, std::numeric_limits<double>::infinity()};

    EXPECT_EQ(rejection_message(NumericColumnView{values, {}, "age"}),
              "Row 2 of column \"age\" holds inf; rows not marked missing must "
              "hold a finite value.");
}

TEST(Validate, NamesTheColumnGenericallyWhenTheCallerGaveNoName) {
    const std::array<double, 1> values{std::numeric_limits<double>::quiet_NaN()};

    EXPECT_EQ(rejection_message(NumericColumnView{values, {}, {}}),
              "Row 1 of the column holds nan; rows not marked missing must hold "
              "a finite value.");
}

TEST(Validate, ReportsTheFirstViolationInRowOrder) {
    const std::array<double, 3> values{
        1.0, std::numeric_limits<double>::quiet_NaN(),
        std::numeric_limits<double>::infinity()};

    EXPECT_EQ(rejection_message(NumericColumnView{values, {}, "age"}),
              "Row 2 of column \"age\" holds nan; rows not marked missing must "
              "hold a finite value.");
}

TEST(Validate, LeavesTheInputUnchanged) {
    std::vector<double> values{3.0, 1.0, 2.0};
    const std::vector<double> before = values;

    sai::core::validate(NumericColumnView{values, {}, "score"});

    EXPECT_EQ(values, before);
}

}  // namespace
