//! 記述統計を公開 API だけで往復する。数値そのものの正しさは C++ 側の
//! 参照テストが持つので、ここで見るのは境界を越えて何が残るか。

use sai_engine::{
    Descriptive,
    DescriptiveOptions,
    DiagnosticCode,
    ENGINE_NAME,
    ErrorKind,
    MISSING_MASK_MISSING,
    MISSING_MASK_PRESENT,
    NumericColumn,
    engine_version,
};

const BOTH_SHAPES: DescriptiveOptions = DescriptiveOptions { include_skewness: true,
                                                             include_kurtosis: true };

fn described(values: &[f64],
             options: DescriptiveOptions)
             -> Descriptive {
    NumericColumn::new(values).with_name("age")
                              .describe(options)
                              .unwrap()
}

/// 参照値ではなく境界の確認なので、エンジンが返した double をそのまま比べる。
fn expect_value(actual: Option<f64>,
                expected: f64) {
    assert_eq!(actual, Some(expected));
}

#[test]
fn every_statistic_of_a_fully_describable_column_comes_back() {
    let result = described(&[1.0, 2.0, 3.0, 4.0, 5.0], BOTH_SHAPES);

    assert_eq!(result.total_count, 5);
    assert_eq!(result.valid_count, 5);
    assert_eq!(result.missing_count, 0);
    expect_value(result.mean, 3.0);
    expect_value(result.standard_deviation, 1.581_138_830_084_189_8);
    expect_value(result.minimum, 1.0);
    expect_value(result.median, 3.0);
    expect_value(result.maximum, 5.0);
    expect_value(result.skewness, 0.0);
    expect_value(result.kurtosis, -1.200_000_000_000_002_8);
    assert!(result.diagnostics.is_empty());
}

#[test]
fn a_missing_row_is_counted_and_its_placeholder_ignored() {
    let values = [1.0, 99.0, 3.0, 5.0];
    let mask = [MISSING_MASK_PRESENT,
                MISSING_MASK_MISSING,
                MISSING_MASK_PRESENT,
                MISSING_MASK_PRESENT];

    let result = NumericColumn::new(&values).with_missing_mask(&mask)
                                            .describe(DescriptiveOptions::default())
                                            .unwrap();

    assert_eq!(result.total_count, 4);
    assert_eq!(result.valid_count, 3);
    assert_eq!(result.missing_count, 1);
    expect_value(result.mean, 3.0);
    expect_value(result.maximum, 5.0);
}

#[test]
fn a_statistic_nobody_asked_for_is_absent_without_a_diagnostic() {
    let result = described(&[1.0, 2.0, 3.0, 4.0, 5.0], DescriptiveOptions::default());

    assert_eq!(result.skewness, None);
    assert_eq!(result.kurtosis, None);
    assert_eq!(result.applied_options, DescriptiveOptions::default());
    assert!(result.diagnostics.is_empty());
}

#[test]
fn each_shape_statistic_can_be_asked_for_without_the_other() {
    let options = DescriptiveOptions { include_skewness: true,
                                       include_kurtosis: false };

    let result = described(&[1.0, 2.0, 3.0, 4.0, 5.0], options);

    assert_eq!(result.applied_options, options);
    assert!(result.skewness.is_some());
    assert_eq!(result.kurtosis, None);
    assert!(result.diagnostics.is_empty());
}

#[test]
fn a_statistic_the_data_cannot_support_carries_the_reason_it_is_absent() {
    let result = described(&[1.0, 2.0], BOTH_SHAPES);

    assert_eq!(result.skewness, None);
    assert_eq!(result.kurtosis, None);

    let targets: Vec<&str> = result.diagnostics.iter().map(|d| d.target.as_str()).collect();
    assert_eq!(targets, ["skewness", "kurtosis"]);
    for diagnostic in &result.diagnostics {
        assert_eq!(diagnostic.code, DiagnosticCode::InsufficientObservations);
        assert_eq!(diagnostic.count, 2);
    }
}

#[test]
fn a_constant_column_has_a_standard_deviation_of_zero_and_no_shape() {
    let result = described(&[4.0, 4.0, 4.0, 4.0], BOTH_SHAPES);

    expect_value(result.standard_deviation, 0.0);
    assert_eq!(result.skewness, None);
    let codes: Vec<DiagnosticCode> = result.diagnostics.iter().map(|d| d.code).collect();
    assert_eq!(codes,
               [DiagnosticCode::VarianceTooSmall, DiagnosticCode::VarianceTooSmall]);
}

#[test]
fn an_empty_column_is_data_rather_than_a_broken_call() {
    let result = described(&[], DescriptiveOptions::default());

    assert_eq!(result.total_count, 0);
    assert_eq!(result.mean, None);
    assert_eq!(result.median, None);

    let targets: Vec<&str> = result.diagnostics.iter().map(|d| d.target.as_str()).collect();
    assert_eq!(targets,
               ["mean", "minimum", "median", "maximum", "standard_deviation"]);
}

#[test]
fn a_column_that_breaks_the_input_contract_is_an_error_and_not_a_diagnostic() {
    let values = [1.0, 2.0, 3.0];
    let mask = [MISSING_MASK_PRESENT, MISSING_MASK_PRESENT];

    let error = NumericColumn::new(&values).with_missing_mask(&mask)
                                           .with_name("age")
                                           .describe(BOTH_SHAPES)
                                           .unwrap_err();

    assert_eq!(error.kind(), ErrorKind::InvalidArgument);
    assert_eq!(error.message(),
               Some("The values and the missing mask of column \"age\" differ in length: 3 and 2."));
}

#[test]
fn the_engine_identifies_the_build_that_produced_a_result() {
    assert_eq!(ENGINE_NAME, "sai-cpp");
    let version = engine_version();
    assert!(!version.is_empty());
    assert!(version.chars().all(|c| c.is_ascii_digit() || c == '.'),
            "{version}");
}
