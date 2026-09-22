// The layout side of the C boundary: that every structure adapters/c_api
// declares can be written by hand in another language, and that a column and a
// diagnostic survive conversion in both directions without losing a field.
//
// The check has its own test because the deleted engine never made it: its
// input type held references to standard containers and turned out not to
// cross the boundary at all.

#include "sai_c.h"

#include <gtest/gtest.h>

#include <array>
#include <cstddef>
#include <cstdint>
#include <span>
#include <string_view>
#include <type_traits>

#include "sai/core/data_view.hpp"
#include "sai/core/diagnostic.hpp"
#include "sai/core/missing.hpp"

namespace {

using sai::core::Diagnostic;
using sai::core::DiagnosticCode;
using sai::core::missing_mask_missing;
using sai::core::missing_mask_present;
using sai::core::NumericColumnView;

// A caller in another language declares these itself, so each one has to be
// reachable without a C++ constructor and copyable as bytes.
static_assert(std::is_standard_layout_v<SaiNumericColumn>);
static_assert(std::is_trivially_copyable_v<SaiNumericColumn>);
static_assert(std::is_standard_layout_v<SaiDiagnostic>);
static_assert(std::is_trivially_copyable_v<SaiDiagnostic>);
static_assert(std::is_standard_layout_v<SaiColumnCounts>);
static_assert(std::is_trivially_copyable_v<SaiColumnCounts>);
static_assert(std::is_standard_layout_v<SaiErrorMessage>);
static_assert(std::is_trivially_copyable_v<SaiErrorMessage>);

template <typename T>
[[nodiscard]] std::span<const T> as_span(const T* data, std::size_t count) {
    if (data == nullptr) {
        return {};
    }
    return std::span<const T>{data, count};
}

[[nodiscard]] SaiNumericColumn to_c(const NumericColumnView& column) {
    return SaiNumericColumn{
        column.values.data(),       column.values.size(),
        column.missing_mask.data(), column.missing_mask.size(),
        column.name.data(),         column.name.size(),
    };
}

[[nodiscard]] NumericColumnView from_c(const SaiNumericColumn& column) {
    const std::string_view name =
        column.name == nullptr ? std::string_view{}
                               : std::string_view{column.name, column.name_length};
    return NumericColumnView{
        as_span(column.values, column.value_count),
        as_span(column.missing_mask, column.missing_mask_count),
        name,
    };
}

[[nodiscard]] SaiDiagnostic to_c(const Diagnostic& diagnostic) {
    return SaiDiagnostic{
        static_cast<std::int32_t>(diagnostic.code),
        diagnostic.target.data(),
        diagnostic.target.size(),
        diagnostic.count,
    };
}

[[nodiscard]] Diagnostic from_c(const SaiDiagnostic& diagnostic) {
    return Diagnostic{
        static_cast<DiagnosticCode>(diagnostic.code),
        diagnostic.target == nullptr
            ? std::string_view{}
            : std::string_view{diagnostic.target, diagnostic.target_length},
        diagnostic.count,
    };
}

TEST(CCompatibility, ANumericColumnSurvivesTheRoundTrip) {
    const std::array<double, 3> values{1.0, 2.0, 3.0};
    const std::array<std::uint8_t, 3> mask{
        missing_mask_present, missing_mask_missing, missing_mask_present};
    const NumericColumnView original{values, mask, "age"};

    const NumericColumnView restored = from_c(to_c(original));

    // The buffers are borrowed, so the same memory has to come back.
    EXPECT_EQ(restored.values.data(), original.values.data());
    EXPECT_EQ(restored.missing_mask.data(), original.missing_mask.data());
    EXPECT_EQ(restored.size(), original.size());
    EXPECT_EQ(restored.name, original.name);
    EXPECT_TRUE(restored.is_missing(1));
}

TEST(CCompatibility, AColumnWithoutAMaskCrossesAsANullPointer) {
    const std::array<double, 2> values{1.0, 2.0};

    const SaiNumericColumn crossed = to_c(NumericColumnView{values, {}, "age"});

    EXPECT_EQ(crossed.missing_mask, nullptr);
    EXPECT_EQ(crossed.missing_mask_count, 0U);
    EXPECT_TRUE(from_c(crossed).missing_mask.empty());
}

TEST(CCompatibility, AnUnnamedColumnCrossesAsANullPointer) {
    const std::array<double, 1> values{1.0};

    const SaiNumericColumn crossed = to_c(NumericColumnView{values, {}, {}});

    EXPECT_EQ(crossed.name, nullptr);
    EXPECT_EQ(crossed.name_length, 0U);
    EXPECT_TRUE(from_c(crossed).name.empty());
}

TEST(CCompatibility, AnEmptyColumnCrossesWithoutAValuePointer) {
    const SaiNumericColumn crossed = to_c(NumericColumnView{});

    EXPECT_EQ(crossed.value_count, 0U);
    EXPECT_EQ(from_c(crossed).size(), 0U);
}

TEST(CCompatibility, ADiagnosticSurvivesTheRoundTrip) {
    const Diagnostic original{DiagnosticCode::VarianceTooSmall, "skewness", 7};

    EXPECT_EQ(from_c(to_c(original)), original);
}

TEST(CCompatibility, ADiagnosticTargetCrossesWithoutATerminator) {
    const Diagnostic original{DiagnosticCode::NotRepresentable, "standard_deviation", 3};

    const SaiDiagnostic crossed = to_c(original);

    EXPECT_EQ(crossed.code, 3);
    EXPECT_EQ(crossed.target_length, std::string_view{"standard_deviation"}.size());
}

}  // namespace
