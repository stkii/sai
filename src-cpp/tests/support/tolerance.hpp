#pragma once

#include <gtest/gtest.h>

namespace sai::test {

// The defaults in docs/NUMERICAL_POLICY.md. A method may tighten or loosen them
// for one comparison; the value and the reason then belong in that method's
// docs/methods/ page and in its fixture.
inline constexpr double default_absolute_tolerance = 1e-12;
inline constexpr double default_relative_tolerance = 1e-10;

// |actual - expected| <= absolute + relative * |expected|. EXPECT_NEAR takes an
// absolute bound only, which no reference value with a large magnitude passes.
[[nodiscard]] ::testing::AssertionResult
is_near(double actual, double expected, double absolute_tolerance = default_absolute_tolerance,
        double relative_tolerance = default_relative_tolerance);

}  // namespace sai::test
