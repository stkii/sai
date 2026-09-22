#include "support/fixture.hpp"

#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <functional>
#include <limits>
#include <locale>
#include <map>
#include <set>
#include <sstream>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

#include "sai/core/missing.hpp"

#ifndef SAI_FIXTURE_DIR
#error "SAI_FIXTURE_DIR must name the tests/fixtures directory; see tests/CMakeLists.txt."
#endif

namespace sai::test {
namespace {

using sai::core::missing_mask_missing;
using sai::core::missing_mask_present;

constexpr std::string_view values_marker = "[values]";
constexpr std::string_view missing_marker = "NA";

[[nodiscard]] std::string_view trim(std::string_view text) {
    const std::size_t first = text.find_first_not_of(" \t\r");
    if (first == std::string_view::npos) {
        return {};
    }
    return text.substr(first, text.find_last_not_of(" \t\r") - first + 1);
}

template <typename T>
[[nodiscard]] bool parse_number(std::string_view text, T& out) {
    std::istringstream stream{std::string{text}};
    // Reference values carry a decimal point whatever locale the test runs in.
    stream.imbue(std::locale::classic());
    stream >> out;
    return !stream.fail() && stream.eof();
}

[[noreturn]] void fail(const std::filesystem::path& path, std::size_t line_number,
                       const std::string& reason) {
    throw std::runtime_error(path.filename().string() + ":" + std::to_string(line_number) + ": " +
                             reason);
}

// Where each header key is stored. One table rather than a parser branch per
// key, so the known keys and the required keys cannot drift apart.
class Targets {
public:
    explicit Targets(DescriptiveFixture& fixture)
        : texts_{{"name", &fixture.name}, {"source", &fixture.source}},
          counts_{{"total_count", &fixture.total_count},
                  {"valid_count", &fixture.valid_count},
                  {"missing_count", &fixture.missing_count}},
          numbers_{{"mean", &fixture.mean},
                   {"standard_deviation", &fixture.standard_deviation},
                   {"minimum", &fixture.minimum},
                   {"median", &fixture.median},
                   {"maximum", &fixture.maximum},
                   {"skewness", &fixture.skewness},
                   {"kurtosis", &fixture.kurtosis}} {}

    [[nodiscard]] bool known(std::string_view key) const {
        return texts_.contains(key) || counts_.contains(key) || numbers_.contains(key);
    }

    // Requires known(key).
    [[nodiscard]] bool assign(std::string_view key, std::string_view value) const {
        if (const auto text = texts_.find(key); text != texts_.end()) {
            *text->second = std::string{value};
            return !value.empty();
        }
        if (const auto count = counts_.find(key); count != counts_.end()) {
            return parse_number(value, *count->second);
        }
        return parse_number(value, *numbers_.at(key));
    }

    [[nodiscard]] std::vector<std::string_view>
    absent_from(const std::set<std::string, std::less<>>& seen) const {
        std::vector<std::string_view> absent;
        append_absent(texts_, seen, absent);
        append_absent(counts_, seen, absent);
        append_absent(numbers_, seen, absent);
        return absent;
    }

private:
    template <typename T>
    static void append_absent(const std::map<std::string_view, T>& table,
                              const std::set<std::string, std::less<>>& seen,
                              std::vector<std::string_view>& absent) {
        for (const auto& [key, target] : table) {
            if (!seen.contains(key)) {
                absent.push_back(key);
            }
        }
    }

    std::map<std::string_view, std::string*> texts_;
    std::map<std::string_view, std::size_t*> counts_;
    std::map<std::string_view, double*> numbers_;
};

void read_header_line(const std::filesystem::path& path, std::size_t line_number,
                      std::string_view text, const Targets& targets,
                      std::set<std::string, std::less<>>& seen) {
    const std::size_t separator = text.find('=');
    if (separator == std::string_view::npos) {
        fail(path, line_number, "Expected a \"key = value\" line or " + std::string{values_marker} + ".");
    }

    const std::string_view key = trim(text.substr(0, separator));
    const std::string_view value = trim(text.substr(separator + 1));
    if (!targets.known(key)) {
        fail(path, line_number, "Unknown key \"" + std::string{key} + "\".");
    }
    if (!seen.insert(std::string{key}).second) {
        fail(path, line_number, "The key \"" + std::string{key} + "\" appears twice.");
    }
    if (!targets.assign(key, value)) {
        fail(path, line_number, "The value of \"" + std::string{key} + "\" is not usable.");
    }
}

void read_value_line(const std::filesystem::path& path, std::size_t line_number,
                     std::string_view text, DescriptiveFixture& fixture) {
    if (text == missing_marker) {
        // The engine never reads the value at a missing row, so a NaN here also
        // shows that the reference test is not relying on the placeholder.
        fixture.values.push_back(std::numeric_limits<double>::quiet_NaN());
        fixture.missing_mask.push_back(missing_mask_missing);
        return;
    }

    double value = 0.0;
    if (!parse_number(text, value)) {
        fail(path, line_number, "\"" + std::string{text} + "\" is neither a number nor " +
                                    std::string{missing_marker} + ".");
    }
    fixture.values.push_back(value);
    fixture.missing_mask.push_back(missing_mask_present);
}

void check_counts(const std::filesystem::path& path, std::size_t line_number,
                  const DescriptiveFixture& fixture) {
    const std::size_t missing = static_cast<std::size_t>(
        std::count(fixture.missing_mask.begin(), fixture.missing_mask.end(), missing_mask_missing));

    if (fixture.values.size() != fixture.total_count) {
        fail(path, line_number, "total_count is " + std::to_string(fixture.total_count) + " but " +
                                    std::to_string(fixture.values.size()) + " values follow.");
    }
    if (missing != fixture.missing_count) {
        fail(path, line_number, "missing_count is " + std::to_string(fixture.missing_count) +
                                    " but " + std::to_string(missing) + " rows are " +
                                    std::string{missing_marker} + ".");
    }
    if (fixture.valid_count + fixture.missing_count != fixture.total_count) {
        fail(path, line_number, "valid_count and missing_count do not add up to total_count.");
    }
}

}  // namespace

DescriptiveFixture load_descriptive_fixture(const std::filesystem::path& path) {
    std::ifstream file{path};
    if (!file) {
        throw std::runtime_error("Cannot open the fixture " + path.string() + ".");
    }

    DescriptiveFixture fixture;
    const Targets targets{fixture};
    std::set<std::string, std::less<>> seen;
    bool reading_values = false;
    std::size_t line_number = 0;
    std::string line;

    while (std::getline(file, line)) {
        ++line_number;
        const std::string_view text = trim(line);

        if (reading_values) {
            read_value_line(path, line_number, text, fixture);
            continue;
        }
        if (text.empty() || text.starts_with('#')) {
            continue;
        }
        if (text == values_marker) {
            reading_values = true;
            continue;
        }
        read_header_line(path, line_number, text, targets, seen);
    }

    if (!reading_values) {
        fail(path, line_number, "The file has no " + std::string{values_marker} + " marker.");
    }
    if (const std::vector<std::string_view> absent = targets.absent_from(seen); !absent.empty()) {
        std::string names;
        for (const std::string_view key : absent) {
            names += (names.empty() ? "" : ", ") + std::string{key};
        }
        fail(path, line_number, "These keys are missing: " + names + ".");
    }
    check_counts(path, line_number, fixture);

    return fixture;
}

std::vector<std::filesystem::path> descriptive_fixture_paths() {
    const std::filesystem::path directory = std::filesystem::path{SAI_FIXTURE_DIR} / "descriptive";
    std::vector<std::filesystem::path> paths;
    for (const std::filesystem::directory_entry& entry :
         std::filesystem::directory_iterator{directory}) {
        if (entry.path().extension() == ".txt") {
            paths.push_back(entry.path());
        }
    }
    std::sort(paths.begin(), paths.end());
    return paths;
}

}  // namespace sai::test
