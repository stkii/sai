#pragma once

#include <cstddef>
#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

namespace sai::test {

// One stored reference case for the descriptive statistics.
//
// The expected values are required and finite: the eight saved columns all
// satisfy the sample-size and variance cutoffs, so none of them exercises a
// statistic that is not returned. A case that does needs a way to record an
// absent value, which this structure does not have yet.
struct DescriptiveFixture {
    std::string name;
    std::string source;

    // A missing row holds NaN, which is a placeholder the engine never reads.
    std::vector<double> values;
    std::vector<std::uint8_t> missing_mask;

    std::size_t total_count{};
    std::size_t valid_count{};
    std::size_t missing_count{};

    double mean{};
    double standard_deviation{};
    double minimum{};
    double median{};
    double maximum{};
    double skewness{};
    double kurtosis{};
};

// Throws std::runtime_error naming the file and the line for anything the
// format does not allow: an unknown, repeated or missing key, a number that
// does not parse, or counts that disagree with the values. A reference test
// that reads a damaged fixture would otherwise report a numerical difference.
[[nodiscard]] DescriptiveFixture load_descriptive_fixture(const std::filesystem::path& path);

// Every descriptive fixture, sorted by name so a failure list stays stable.
[[nodiscard]] std::vector<std::filesystem::path> descriptive_fixture_paths();

}  // namespace sai::test
