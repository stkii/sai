// The stored reference values, read the way Step 8's reference test will read
// them. Until the statistics exist there is nothing to compare against, so this
// checks that every fixture loads and describes itself consistently.

#include "support/fixture.hpp"

#include <gtest/gtest.h>

#include <cstddef>
#include <filesystem>
#include <fstream>
#include <stdexcept>
#include <string>
#include <string_view>
#include <tuple>

#include "sai/core/data_view.hpp"
#include "sai/core/missing.hpp"
#include "support/tolerance.hpp"

namespace {

using sai::core::missing_mask_missing;
using sai::core::NumericColumnView;
using sai::test::DescriptiveFixture;
using sai::test::descriptive_fixture_paths;
using sai::test::is_near;
using sai::test::load_descriptive_fixture;

constexpr std::string_view two_row_fixture = R"(# A comment.
name = example
source = handwritten
total_count = 2
valid_count = 1
missing_count = 1
mean = 4
standard_deviation = 0
minimum = 4
median = 4
maximum = 4
skewness = 0
kurtosis = 0
[values]
4
NA
)";

// A file the stored fixtures never look like, so the loader can be shown
// rejecting it. Removed again to keep the temporary directory as it was found.
class TemporaryFixture {
public:
    TemporaryFixture(std::string_view name, std::string_view content)
        : path_{std::filesystem::temp_directory_path() / ("sai_" + std::string{name} + ".txt")} {
        std::ofstream file{path_};
        file << content;
    }

    ~TemporaryFixture() { std::filesystem::remove(path_); }

    TemporaryFixture(const TemporaryFixture&) = delete;
    TemporaryFixture& operator=(const TemporaryFixture&) = delete;

    [[nodiscard]] const std::filesystem::path& path() const noexcept { return path_; }

private:
    std::filesystem::path path_;
};

[[nodiscard]] std::string replaced(std::string_view original, std::string_view from,
                                   std::string_view to) {
    std::string text{original};
    const std::size_t position = text.find(from);
    EXPECT_NE(position, std::string::npos) << from;
    text.replace(position, from.size(), to);
    return text;
}

TEST(DescriptiveFixtures, AreAllPresent) {
    EXPECT_EQ(descriptive_fixture_paths().size(), 8U);
}

TEST(DescriptiveFixtures, LoadWithCountsThatAgreeWithTheValues) {
    for (const std::filesystem::path& path : descriptive_fixture_paths()) {
        const DescriptiveFixture fixture = load_descriptive_fixture(path);
        SCOPED_TRACE(fixture.name);

        EXPECT_EQ(fixture.values.size(), fixture.total_count);
        EXPECT_EQ(fixture.missing_mask.size(), fixture.total_count);
        EXPECT_EQ(fixture.valid_count + fixture.missing_count, fixture.total_count);
        EXPECT_FALSE(fixture.source.empty());
    }
}

TEST(DescriptiveFixtures, CrossTheEnginesInputContract) {
    for (const std::filesystem::path& path : descriptive_fixture_paths()) {
        const DescriptiveFixture fixture = load_descriptive_fixture(path);
        SCOPED_TRACE(fixture.name);

        const NumericColumnView column{fixture.values, fixture.missing_mask, fixture.name};
        EXPECT_NO_THROW(sai::core::validate(column));
        EXPECT_EQ(column.size(), fixture.total_count);
    }
}

TEST(DescriptiveFixtures, HoldExpectedValuesInAConsistentOrder) {
    for (const std::filesystem::path& path : descriptive_fixture_paths()) {
        const DescriptiveFixture fixture = load_descriptive_fixture(path);
        SCOPED_TRACE(fixture.name);

        EXPECT_LE(fixture.minimum, fixture.median);
        EXPECT_LE(fixture.median, fixture.maximum);
        EXPECT_LE(fixture.minimum, fixture.mean);
        EXPECT_LE(fixture.mean, fixture.maximum);
        EXPECT_GT(fixture.standard_deviation, 0.0);
    }
}

TEST(DescriptiveFixtures, KeepTheValuesInTheOrderTheyWereGenerated) {
    const TemporaryFixture file{"order", two_row_fixture};

    const DescriptiveFixture fixture = load_descriptive_fixture(file.path());

    ASSERT_EQ(fixture.values.size(), 2U);
    EXPECT_TRUE(is_near(fixture.values.front(), 4.0));
    EXPECT_EQ(fixture.missing_mask.back(), missing_mask_missing);
}

TEST(TheFixtureLoader, RejectsAnUnknownKey) {
    const TemporaryFixture file{"unknown_key",
                                replaced(two_row_fixture, "[values]", "variance = 1\n[values]")};

    EXPECT_THROW(std::ignore = load_descriptive_fixture(file.path()), std::runtime_error);
}

TEST(TheFixtureLoader, RejectsARepeatedKey) {
    const TemporaryFixture file{"repeated_key",
                                replaced(two_row_fixture, "[values]", "mean = 5\n[values]")};

    EXPECT_THROW(std::ignore = load_descriptive_fixture(file.path()), std::runtime_error);
}

TEST(TheFixtureLoader, RejectsAMissingKey) {
    const TemporaryFixture file{"missing_key", replaced(two_row_fixture, "median = 4\n", "")};

    EXPECT_THROW(std::ignore = load_descriptive_fixture(file.path()), std::runtime_error);
}

TEST(TheFixtureLoader, RejectsACountThatDisagreesWithTheValues) {
    const TemporaryFixture file{"bad_count",
                                replaced(two_row_fixture, "total_count = 2", "total_count = 3")};

    EXPECT_THROW(std::ignore = load_descriptive_fixture(file.path()), std::runtime_error);
}

TEST(TheFixtureLoader, RejectsAValueThatIsNotANumber) {
    const TemporaryFixture file{"bad_value", replaced(two_row_fixture, "\n4\nNA", "\n4.0.0\nNA")};

    EXPECT_THROW(std::ignore = load_descriptive_fixture(file.path()), std::runtime_error);
}

TEST(TheFixtureLoader, NamesTheFileAndTheLineItRejected) {
    const TemporaryFixture file{"bad_number", replaced(two_row_fixture, "mean = 4", "mean = ?")};

    try {
        std::ignore = load_descriptive_fixture(file.path());
        FAIL() << "The loader accepted a value that is not a number.";
    } catch (const std::runtime_error& error) {
        const std::string message = error.what();
        EXPECT_NE(message.find("sai_bad_number.txt:7"), std::string::npos) << message;
    }
}

}  // namespace
