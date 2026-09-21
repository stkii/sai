#include "sai/core/diagnostic.hpp"

#include <gtest/gtest.h>

#include <cstdint>
#include <type_traits>
#include <vector>

namespace {

using sai::core::Diagnostic;
using sai::core::DiagnosticCode;

// The values cross the C boundary; changing one silently would change what the
// GUI displays.
static_assert(std::is_same_v<std::underlying_type_t<DiagnosticCode>, std::int32_t>);
static_assert(static_cast<std::int32_t>(DiagnosticCode::InsufficientObservations) == 1);
static_assert(static_cast<std::int32_t>(DiagnosticCode::VarianceTooSmall) == 2);
static_assert(static_cast<std::int32_t>(DiagnosticCode::NotRepresentable) == 3);

TEST(DiagnosticCodes, LeaveZeroUnused) {
    const Diagnostic unset{};

    EXPECT_NE(unset.code, DiagnosticCode::InsufficientObservations);
    EXPECT_NE(unset.code, DiagnosticCode::VarianceTooSmall);
    EXPECT_NE(unset.code, DiagnosticCode::NotRepresentable);
}

TEST(Diagnostic, CarriesCodeTargetAndCount) {
    const Diagnostic diagnostic{DiagnosticCode::InsufficientObservations, "skewness", 2};

    EXPECT_EQ(diagnostic.code, DiagnosticCode::InsufficientObservations);
    EXPECT_EQ(diagnostic.target, "skewness");
    EXPECT_EQ(diagnostic.count, 2U);
}

TEST(Diagnostic, ComparesByEveryField) {
    // Reference tests match a whole set exactly, so two diagnostics differing
    // only in target must not compare equal.
    const Diagnostic skewness{DiagnosticCode::InsufficientObservations, "skewness", 2};
    const Diagnostic kurtosis{DiagnosticCode::InsufficientObservations, "kurtosis", 2};

    EXPECT_EQ(skewness, (Diagnostic{DiagnosticCode::InsufficientObservations, "skewness", 2}));
    EXPECT_NE(skewness, kurtosis);
}

TEST(Diagnostic, OutlivesTheScopeThatProducedIt) {
    // Targets are string literals, so no owner is needed at the C boundary.
    std::vector<Diagnostic> diagnostics;
    {
        const Diagnostic produced{DiagnosticCode::VarianceTooSmall, "standard_deviation", 10};
        diagnostics.push_back(produced);
    }

    EXPECT_EQ(diagnostics.front().target, "standard_deviation");
}

}  // namespace
