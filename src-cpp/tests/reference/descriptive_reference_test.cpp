// The engine against the values stored in tests/fixtures/descriptive/, which
// R produced and the SPSS application did not.

#include "sai/analysis/descriptive.hpp"

#include <gtest/gtest.h>

#include <filesystem>

#include "sai/core/data_view.hpp"
#include "support/fixture.hpp"
#include "support/tolerance.hpp"

namespace {

using sai::analysis::describe;
using sai::analysis::DescriptiveOptions;
using sai::analysis::DescriptiveResult;
using sai::core::NumericColumnView;
using sai::test::DescriptiveFixture;
using sai::test::descriptive_fixture_paths;
using sai::test::is_near;
using sai::test::load_descriptive_fixture;

// Every stored case records both shape statistics, so both are asked for.
constexpr DescriptiveOptions stored_options{.include_skewness = true, .include_kurtosis = true};

void expect_matches(const DescriptiveResult& result, const DescriptiveFixture& fixture) {
    EXPECT_EQ(result.total_count, fixture.total_count);
    EXPECT_EQ(result.valid_count, fixture.valid_count);
    EXPECT_EQ(result.missing_count, fixture.missing_count);

    // Every stored column clears the sample-size and variance cutoffs, so an
    // absent value is a failure rather than a case the fixture cannot express.
    ASSERT_TRUE(result.mean.has_value());
    ASSERT_TRUE(result.standard_deviation.has_value());
    ASSERT_TRUE(result.minimum.has_value());
    ASSERT_TRUE(result.median.has_value());
    ASSERT_TRUE(result.maximum.has_value());
    ASSERT_TRUE(result.skewness.has_value());
    ASSERT_TRUE(result.kurtosis.has_value());

    EXPECT_TRUE(is_near(*result.mean, fixture.mean));
    EXPECT_TRUE(is_near(*result.standard_deviation, fixture.standard_deviation));
    EXPECT_TRUE(is_near(*result.minimum, fixture.minimum));
    EXPECT_TRUE(is_near(*result.median, fixture.median));
    EXPECT_TRUE(is_near(*result.maximum, fixture.maximum));
    EXPECT_TRUE(is_near(*result.skewness, fixture.skewness));
    EXPECT_TRUE(is_near(*result.kurtosis, fixture.kurtosis));
}

TEST(DescriptiveReference, MatchesEveryStoredColumn) {
    for (const std::filesystem::path& path : descriptive_fixture_paths()) {
        const DescriptiveFixture fixture = load_descriptive_fixture(path);
        SCOPED_TRACE(fixture.name);

        const NumericColumnView column{fixture.values, fixture.missing_mask, fixture.name};
        expect_matches(describe(column, stored_options), fixture);
    }
}

TEST(DescriptiveReference, ReportsNothingMissingForAnyStoredColumn) {
    for (const std::filesystem::path& path : descriptive_fixture_paths()) {
        const DescriptiveFixture fixture = load_descriptive_fixture(path);
        SCOPED_TRACE(fixture.name);

        const NumericColumnView column{fixture.values, fixture.missing_mask, fixture.name};
        EXPECT_TRUE(describe(column, stored_options).diagnostics.empty());
    }
}

// The shape statistics are the only optional ones, so leaving them out must
// not move anything else the stored values cover.
TEST(DescriptiveReference, GivesTheSameValuesWithoutTheShapeStatistics) {
    for (const std::filesystem::path& path : descriptive_fixture_paths()) {
        const DescriptiveFixture fixture = load_descriptive_fixture(path);
        SCOPED_TRACE(fixture.name);

        const NumericColumnView column{fixture.values, fixture.missing_mask, fixture.name};
        const DescriptiveResult result = describe(column);

        EXPECT_TRUE(is_near(*result.mean, fixture.mean));
        EXPECT_TRUE(is_near(*result.standard_deviation, fixture.standard_deviation));
        EXPECT_TRUE(is_near(*result.median, fixture.median));
        EXPECT_FALSE(result.skewness.has_value());
        EXPECT_FALSE(result.kurtosis.has_value());
    }
}

}  // namespace
