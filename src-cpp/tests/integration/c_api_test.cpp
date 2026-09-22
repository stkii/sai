// Only sai_c.h is included: if a test here needed a header from include/sai/,
// the adapter would be leaking C++ types into the boundary.

#include "sai_c.h"

#include <gtest/gtest.h>

#include <array>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <string_view>

namespace {

// So a failing expectation cannot also surface as a sanitizer leak report.
class OwnedError {
public:
    OwnedError() = default;
    ~OwnedError() { sai_error_message_destroy(&message_); }

    OwnedError(const OwnedError&) = delete;
    OwnedError& operator=(const OwnedError&) = delete;

    [[nodiscard]] SaiErrorMessage* out() noexcept { return &message_; }

    [[nodiscard]] std::string_view text() const noexcept {
        if (message_.data == nullptr) {
            return {};
        }
        return std::string_view{message_.data, message_.length};
    }

    [[nodiscard]] bool empty() const noexcept { return message_.data == nullptr; }

private:
    SaiErrorMessage message_{};
};

[[nodiscard]] SaiNumericColumn column_of(const double* values, std::size_t value_count,
                                         const std::uint8_t* mask, std::size_t mask_count,
                                         std::string_view name) noexcept {
    return SaiNumericColumn{
        values, value_count, mask, mask_count, name.data(), name.size(),
    };
}

TEST(CApi, AColumnWithoutAMaskCountsEveryRow) {
    const std::array<double, 4> values{1.0, 2.0, 3.0, 4.0};
    const SaiNumericColumn column = column_of(values.data(), values.size(), nullptr, 0, "age");

    SaiColumnCounts counts{};
    OwnedError error;
    const SaiStatus status = sai_numeric_column_counts(&column, &counts, error.out());

    EXPECT_EQ(status, sai_status_ok);
    EXPECT_TRUE(error.empty());
    EXPECT_EQ(counts.row_count, 4U);
    EXPECT_EQ(counts.valid_count, 4U);
}

TEST(CApi, AMaskedRowIsCountedAsARowButNotAsAValidOne) {
    const std::array<double, 4> values{1.0, 0.0, 3.0, 0.0};
    const std::array<std::uint8_t, 4> mask{0, 1, 0, 1};
    const SaiNumericColumn column =
        column_of(values.data(), values.size(), mask.data(), mask.size(), "age");

    SaiColumnCounts counts{};
    const SaiStatus status = sai_numeric_column_counts(&column, &counts, nullptr);

    EXPECT_EQ(status, sai_status_ok);
    EXPECT_EQ(counts.row_count, 4U);
    EXPECT_EQ(counts.valid_count, 2U);
}

TEST(CApi, AFullyMissingColumnIsValidInputAndCountsZero) {
    const std::array<double, 2> values{0.0, 0.0};
    const std::array<std::uint8_t, 2> mask{1, 1};
    const SaiNumericColumn column =
        column_of(values.data(), values.size(), mask.data(), mask.size(), "age");

    SaiColumnCounts counts{};
    OwnedError error;

    EXPECT_EQ(sai_numeric_column_counts(&column, &counts, error.out()), sai_status_ok);
    EXPECT_EQ(counts.row_count, 2U);
    EXPECT_EQ(counts.valid_count, 0U);
}

TEST(CApi, AnEmptyColumnCrossesAsNullPointersAndCountsZero) {
    const SaiNumericColumn column = column_of(nullptr, 0, nullptr, 0, {});

    SaiColumnCounts counts{};
    OwnedError error;

    EXPECT_EQ(sai_numeric_column_counts(&column, &counts, error.out()), sai_status_ok);
    EXPECT_EQ(counts.row_count, 0U);
    EXPECT_EQ(counts.valid_count, 0U);
}

TEST(CApi, ANonFiniteValueAtAMissingRowIsAccepted) {
    // The value at a missing row is a placeholder and is never read.
    const std::array<double, 2> values{1.0, std::numeric_limits<double>::infinity()};
    const std::array<std::uint8_t, 2> mask{0, 1};
    const SaiNumericColumn column =
        column_of(values.data(), values.size(), mask.data(), mask.size(), "age");

    SaiColumnCounts counts{};

    EXPECT_EQ(sai_numeric_column_counts(&column, &counts, nullptr), sai_status_ok);
    EXPECT_EQ(counts.valid_count, 1U);
}

TEST(CApi, AMaskOfTheWrongLengthReturnsTheEnginesSentence) {
    const std::array<double, 3> values{1.0, 2.0, 3.0};
    const std::array<std::uint8_t, 2> mask{0, 0};
    const SaiNumericColumn column =
        column_of(values.data(), values.size(), mask.data(), mask.size(), "age");

    SaiColumnCounts counts{};
    OwnedError error;
    const SaiStatus status = sai_numeric_column_counts(&column, &counts, error.out());

    EXPECT_EQ(status, sai_status_invalid_argument);
    EXPECT_EQ(error.text(),
              "The values and the missing mask of column \"age\" differ in length: 3 and 2.");
}

TEST(CApi, AMaskValueOtherThanZeroOrOneIsRejected) {
    const std::array<double, 2> values{1.0, 2.0};
    const std::array<std::uint8_t, 2> mask{0, 2};
    const SaiNumericColumn column =
        column_of(values.data(), values.size(), mask.data(), mask.size(), "age");

    SaiColumnCounts counts{};
    OwnedError error;
    const SaiStatus status = sai_numeric_column_counts(&column, &counts, error.out());

    EXPECT_EQ(status, sai_status_invalid_argument);
    EXPECT_EQ(error.text(),
              "Row 2 of column \"age\" has a missing mask value of 2; "
              "each element must be 0 or 1.");
}

TEST(CApi, ANonFiniteValueAtAPresentRowIsRejected) {
    const std::array<double, 2> values{1.0, std::numeric_limits<double>::infinity()};
    const SaiNumericColumn column = column_of(values.data(), values.size(), nullptr, 0, {});

    SaiColumnCounts counts{};
    OwnedError error;
    const SaiStatus status = sai_numeric_column_counts(&column, &counts, error.out());

    EXPECT_EQ(status, sai_status_invalid_argument);
    // The caller passed no name, so the sentence says "the column".
    EXPECT_EQ(error.text(),
              "Row 2 of the column holds inf; "
              "rows not marked missing must hold a finite value.");
}

TEST(CApi, ARejectedColumnLeavesTheCountsUntouched) {
    const std::array<double, 1> values{1.0};
    const std::array<std::uint8_t, 2> mask{0, 0};
    const SaiNumericColumn column =
        column_of(values.data(), values.size(), mask.data(), mask.size(), "age");

    SaiColumnCounts counts{77, 77};
    OwnedError error;

    EXPECT_EQ(sai_numeric_column_counts(&column, &counts, error.out()),
              sai_status_invalid_argument);
    EXPECT_EQ(counts.row_count, 77U);
    EXPECT_EQ(counts.valid_count, 77U);
}

TEST(CApi, ANullColumnIsReportedRatherThanDereferenced) {
    SaiColumnCounts counts{};
    OwnedError error;
    const SaiStatus status = sai_numeric_column_counts(nullptr, &counts, error.out());

    EXPECT_EQ(status, sai_status_invalid_argument);
    EXPECT_EQ(error.text(), "The column argument is null.");
}

TEST(CApi, ANullResultPointerIsReported) {
    const std::array<double, 1> values{1.0};
    const SaiNumericColumn column = column_of(values.data(), values.size(), nullptr, 0, "age");

    OwnedError error;
    const SaiStatus status = sai_numeric_column_counts(&column, nullptr, error.out());

    EXPECT_EQ(status, sai_status_invalid_argument);
    EXPECT_EQ(error.text(), "The out_counts argument is null.");
}

TEST(CApi, ASuccessfulCallClearsAMessageLeftByAnEarlierFailure) {
    const std::array<double, 1> values{1.0};
    const std::array<std::uint8_t, 2> mask{0, 0};
    SaiColumnCounts counts{};
    OwnedError error;

    const SaiNumericColumn rejected =
        column_of(values.data(), values.size(), mask.data(), mask.size(), "age");
    ASSERT_EQ(sai_numeric_column_counts(&rejected, &counts, error.out()),
              sai_status_invalid_argument);
    ASSERT_FALSE(error.empty());

    // The caller owns the first message and releases it before reusing the
    // structure, which the next call would otherwise overwrite.
    sai_error_message_destroy(error.out());

    const SaiNumericColumn accepted =
        column_of(values.data(), values.size(), nullptr, 0, "age");
    EXPECT_EQ(sai_numeric_column_counts(&accepted, &counts, error.out()), sai_status_ok);
    EXPECT_TRUE(error.empty());
}

TEST(CApi, DestroyingAMessageIsIdempotentAndNullSafe) {
    const std::array<double, 1> values{1.0};
    const std::array<std::uint8_t, 2> mask{0, 0};
    const SaiNumericColumn column =
        column_of(values.data(), values.size(), mask.data(), mask.size(), "age");

    SaiColumnCounts counts{};
    SaiErrorMessage message{};
    ASSERT_EQ(sai_numeric_column_counts(&column, &counts, &message),
              sai_status_invalid_argument);
    ASSERT_NE(message.data, nullptr);

    sai_error_message_destroy(&message);
    EXPECT_EQ(message.data, nullptr);
    EXPECT_EQ(message.length, 0U);

    sai_error_message_destroy(&message);
    sai_error_message_destroy(nullptr);
}

TEST(CApi, TheMessageIsNullTerminatedAsWellAsMeasured) {
    const std::array<double, 1> values{1.0};
    const std::array<std::uint8_t, 2> mask{0, 0};
    const SaiNumericColumn column =
        column_of(values.data(), values.size(), mask.data(), mask.size(), "age");

    SaiColumnCounts counts{};
    OwnedError error;
    ASSERT_EQ(sai_numeric_column_counts(&column, &counts, error.out()),
              sai_status_invalid_argument);

    const std::string_view text = error.text();
    ASSERT_FALSE(text.empty());
    // A caller that only has the pointer still reads the whole sentence.
    EXPECT_EQ(std::string_view{text.data()}, text);
}


// The statistics themselves are checked in unit/descriptive_test.cpp against
// hand computed values. What these cover is the crossing: that each field
// arrives, that an absent value stays absent, and that the diagnostics come
// with it. The engine and the boundary compute the same doubles, so the
// comparison here is for equal bits and not for numerical agreement.
constexpr SaiDescriptiveOptions both_shapes{1, 1};

[[nodiscard]] SaiDescriptiveResult described(const SaiNumericColumn& column,
                                             const SaiDescriptiveOptions* options) {
    SaiDescriptiveResult result{};
    OwnedError error;
    EXPECT_EQ(sai_describe(&column, options, &result, error.out()), sai_status_ok);
    EXPECT_TRUE(error.empty()) << error.text();
    return result;
}

TEST(CApiDescribe, EveryStatisticOfAFullyDescribableColumnCrosses) {
    const std::array<double, 5> values{1.0, 2.0, 3.0, 4.0, 5.0};
    const SaiNumericColumn column = column_of(values.data(), values.size(), nullptr, 0, "age");

    const SaiDescriptiveResult result = described(column, &both_shapes);

    EXPECT_EQ(result.total_count, 5U);
    EXPECT_EQ(result.valid_count, 5U);
    EXPECT_EQ(result.missing_count, 0U);
    EXPECT_EQ(result.diagnostic_count, 0U);

    ASSERT_EQ(result.mean.present, 1);
    EXPECT_DOUBLE_EQ(result.mean.value, 3.0);
    ASSERT_EQ(result.standard_deviation.present, 1);
    EXPECT_DOUBLE_EQ(result.standard_deviation.value, 1.5811388300841898);
    ASSERT_EQ(result.minimum.present, 1);
    EXPECT_DOUBLE_EQ(result.minimum.value, 1.0);
    ASSERT_EQ(result.median.present, 1);
    EXPECT_DOUBLE_EQ(result.median.value, 3.0);
    ASSERT_EQ(result.maximum.present, 1);
    EXPECT_DOUBLE_EQ(result.maximum.value, 5.0);
    ASSERT_EQ(result.skewness.present, 1);
    EXPECT_DOUBLE_EQ(result.skewness.value, 0.0);
    ASSERT_EQ(result.kurtosis.present, 1);
    EXPECT_DOUBLE_EQ(result.kurtosis.value, -1.2000000000000028);
}

TEST(CApiDescribe, AMissingRowIsCountedAndItsValueIgnored) {
    const std::array<double, 4> values{1.0, 99.0, 3.0, 5.0};
    const std::array<std::uint8_t, 4> mask{0, 1, 0, 0};
    const SaiNumericColumn column =
        column_of(values.data(), values.size(), mask.data(), mask.size(), "age");

    const SaiDescriptiveResult result = described(column, nullptr);

    EXPECT_EQ(result.total_count, 4U);
    EXPECT_EQ(result.valid_count, 3U);
    EXPECT_EQ(result.missing_count, 1U);
    EXPECT_DOUBLE_EQ(result.mean.value, 3.0);
    EXPECT_DOUBLE_EQ(result.maximum.value, 5.0);
}

TEST(CApiDescribe, NoOptionsAsksForNeitherShapeStatisticAndIsNotADiagnostic) {
    const std::array<double, 5> values{1.0, 2.0, 3.0, 4.0, 5.0};
    const SaiNumericColumn column = column_of(values.data(), values.size(), nullptr, 0, "age");

    const SaiDescriptiveResult result = described(column, nullptr);

    EXPECT_EQ(result.applied_options.include_skewness, 0);
    EXPECT_EQ(result.applied_options.include_kurtosis, 0);
    EXPECT_EQ(result.skewness.present, 0);
    EXPECT_EQ(result.kurtosis.present, 0);
    EXPECT_EQ(result.diagnostic_count, 0U);
}

TEST(CApiDescribe, AFlagOtherThanOneStillAsksForTheStatistic) {
    const std::array<double, 5> values{1.0, 2.0, 3.0, 4.0, 5.0};
    const SaiNumericColumn column = column_of(values.data(), values.size(), nullptr, 0, "age");
    const SaiDescriptiveOptions options{2, 0};

    const SaiDescriptiveResult result = described(column, &options);

    // What crosses back is what the engine applied, which is the flag it
    // understood rather than the byte the caller wrote.
    EXPECT_EQ(result.applied_options.include_skewness, 1);
    EXPECT_EQ(result.skewness.present, 1);
}

TEST(CApiDescribe, AStatisticTheDataCannotSupportCrossesAsADiagnostic) {
    const std::array<double, 2> values{1.0, 2.0};
    const SaiNumericColumn column = column_of(values.data(), values.size(), nullptr, 0, "age");

    const SaiDescriptiveResult result = described(column, &both_shapes);

    EXPECT_EQ(result.skewness.present, 0);
    EXPECT_EQ(result.kurtosis.present, 0);
    ASSERT_EQ(result.diagnostic_count, 2U);

    const SaiDiagnostic& first = result.diagnostics[0];
    EXPECT_EQ(first.code, 1);
    EXPECT_EQ(std::string_view(first.target, first.target_length), "skewness");
    EXPECT_EQ(first.count, 2U);
    const SaiDiagnostic& second = result.diagnostics[1];
    EXPECT_EQ(std::string_view(second.target, second.target_length), "kurtosis");
}

TEST(CApiDescribe, AnEmptyColumnIsDataRatherThanABrokenCall) {
    const SaiNumericColumn column = column_of(nullptr, 0, nullptr, 0, "age");

    const SaiDescriptiveResult result = described(column, nullptr);

    EXPECT_EQ(result.total_count, 0U);
    EXPECT_EQ(result.mean.present, 0);
    // One for each of mean, minimum, median, maximum and the standard deviation.
    EXPECT_EQ(result.diagnostic_count, 5U);
}

TEST(CApiDescribe, AReusedResultKeepsNothingFromAnEarlierCall) {
    const std::array<double, 2> values{1.0, 2.0};
    const SaiNumericColumn short_column =
        column_of(values.data(), values.size(), nullptr, 0, "age");
    const std::array<double, 5> longer{1.0, 2.0, 3.0, 4.0, 5.0};
    const SaiNumericColumn full_column = column_of(longer.data(), longer.size(), nullptr, 0, "age");

    SaiDescriptiveResult result{};
    ASSERT_EQ(sai_describe(&short_column, &both_shapes, &result, nullptr), sai_status_ok);
    ASSERT_EQ(result.diagnostic_count, 2U);

    ASSERT_EQ(sai_describe(&full_column, &both_shapes, &result, nullptr), sai_status_ok);
    EXPECT_EQ(result.diagnostic_count, 0U);
    EXPECT_EQ(result.skewness.present, 1);
}

TEST(CApiDescribe, ARejectedColumnLeavesTheResultUntouched) {
    const std::array<double, 3> values{1.0, 2.0, 3.0};
    const std::array<std::uint8_t, 2> mask{0, 0};
    const SaiNumericColumn column =
        column_of(values.data(), values.size(), mask.data(), mask.size(), "age");

    SaiDescriptiveResult result{};
    result.total_count = 77;
    OwnedError error;
    const SaiStatus status = sai_describe(&column, nullptr, &result, error.out());

    EXPECT_EQ(status, sai_status_invalid_argument);
    EXPECT_EQ(result.total_count, 77U);
    EXPECT_EQ(error.text(),
              "The values and the missing mask of column \"age\" differ in length: 3 and 2.");
}

TEST(CApiDescribe, ANullResultPointerIsReportedRatherThanWrittenThrough) {
    const std::array<double, 1> values{1.0};
    const SaiNumericColumn column = column_of(values.data(), values.size(), nullptr, 0, "age");

    OwnedError error;
    const SaiStatus status = sai_describe(&column, nullptr, nullptr, error.out());

    EXPECT_EQ(status, sai_status_invalid_argument);
    EXPECT_EQ(error.text(), "The out_result argument is null.");
}

TEST(CApiDescribe, ANullColumnIsReportedRatherThanDereferenced) {
    SaiDescriptiveResult result{};
    OwnedError error;

    EXPECT_EQ(sai_describe(nullptr, nullptr, &result, error.out()), sai_status_invalid_argument);
    EXPECT_EQ(error.text(), "The column argument is null.");
}

TEST(CApi, TheEngineNamesTheBuildThatProducedAResult) {
    const std::string_view version{sai_engine_version()};

    // Recorded with a stored result, so it has to be readable and stay the
    // shape a caller can compare against another build.
    EXPECT_FALSE(version.empty());
    for (const char character : version) {
        EXPECT_TRUE((character >= '0' && character <= '9') || character == '.') << version;
    }
}

}  // namespace
