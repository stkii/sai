#include "support/tolerance.hpp"

#include <gtest/gtest.h>

#include <limits>

namespace {

using sai::test::default_absolute_tolerance;
using sai::test::default_relative_tolerance;
using sai::test::is_near;

TEST(Tolerance, AcceptsAValueWithinTheAbsoluteBoundNearZero) {
    EXPECT_TRUE(is_near(1e-13, 0.0));
    EXPECT_FALSE(is_near(1e-11, 0.0));
}

TEST(Tolerance, ScalesWithTheMagnitudeOfTheExpectedValue) {
    // The absolute bound alone rejects this, which is why EXPECT_NEAR is not
    // enough for stored reference values.
    const double expected = 1.0e6;
    const double actual = expected + 1.0e-5;

    EXPECT_TRUE(is_near(actual, expected));
    EXPECT_GT(actual - expected, default_absolute_tolerance);
}

TEST(Tolerance, SeparatesADifferenceInsideTheAllowanceFromOneOutsideIt) {
    const double expected = 2.0;
    const double allowed = default_absolute_tolerance + default_relative_tolerance * expected;

    // Half and double rather than the boundary itself: recovering the exact
    // allowance from expected + allowed costs an ulp, which at 2.0 is larger
    // than the difference under test.
    EXPECT_TRUE(is_near(expected + allowed * 0.5, expected));
    EXPECT_FALSE(is_near(expected + allowed * 2.0, expected));
}

TEST(Tolerance, TreatsTheToleranceAsRelativeToTheExpectedValue) {
    // Not symmetric: the same pair compared the other way round has a different
    // allowance, so the argument order matters.
    EXPECT_TRUE(is_near(1.0e-11, 0.0, 1.0e-10, 0.0));
    EXPECT_FALSE(is_near(0.0, 1.0e-11, 1.0e-12, 1.0e-3));
}

TEST(Tolerance, ReportsANonFiniteValueRatherThanComparingIt) {
    const double infinity = std::numeric_limits<double>::infinity();

    EXPECT_FALSE(is_near(std::numeric_limits<double>::quiet_NaN(), 1.0));
    EXPECT_FALSE(is_near(infinity, infinity));
}

}  // namespace
