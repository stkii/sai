#include "support/tolerance.hpp"

#include <cmath>

#include <gtest/gtest.h>

namespace sai::test {

::testing::AssertionResult is_near(double actual, double expected, double absolute_tolerance,
                                   double relative_tolerance) {
    // A NaN fails every comparison below, so it would otherwise be reported as
    // an ordinary difference with an unreadable magnitude.
    if (!std::isfinite(actual) || !std::isfinite(expected)) {
        return ::testing::AssertionFailure()
               << "actual is " << actual << " and expected is " << expected
               << "; both must be finite.";
    }

    const double allowed = absolute_tolerance + relative_tolerance * std::abs(expected);
    const double difference = std::abs(actual - expected);
    if (difference <= allowed) {
        return ::testing::AssertionSuccess();
    }
    return ::testing::AssertionFailure()
           << "actual is " << actual << " and expected is " << expected << "; they differ by "
           << difference << ", which exceeds the allowed " << allowed << ".";
}

}  // namespace sai::test
