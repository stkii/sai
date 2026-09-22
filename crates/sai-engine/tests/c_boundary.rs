//! 公開 API だけを使ってエンジンを往復する。ここで `unsafe` や生ポインターが
//! 必要になるなら、クレートが FFI を閉じ込めきれていないことになる。

use sai_engine::{
    ErrorKind,
    MISSING_MASK_MISSING,
    MISSING_MASK_PRESENT,
    NumericColumn,
};

#[test]
fn a_column_without_a_mask_counts_every_row() {
    let values = [1.0, 2.0, 3.0];

    let counts = NumericColumn::new(&values).counts().unwrap();

    assert_eq!(counts.row_count, 3);
    assert_eq!(counts.valid_count, 3);
}

#[test]
fn a_masked_row_is_counted_as_a_row_but_not_as_a_valid_one() {
    let values = [1.0, 2.0, 3.0];
    let mask = [MISSING_MASK_PRESENT, MISSING_MASK_MISSING, MISSING_MASK_PRESENT];

    let counts = NumericColumn::new(&values).with_missing_mask(&mask)
                                            .with_name("age")
                                            .counts()
                                            .unwrap();

    assert_eq!(counts.row_count, 3);
    assert_eq!(counts.valid_count, 2);
}

#[test]
fn an_empty_column_is_valid_input_and_counts_zero() {
    let counts = NumericColumn::new(&[]).counts().unwrap();

    assert_eq!(counts.row_count, 0);
    assert_eq!(counts.valid_count, 0);
}

#[test]
fn a_non_finite_value_at_a_missing_row_is_accepted() {
    // 欠損行の値は置き場所にすぎず、エンジンは読まない。
    let values = [1.0, f64::NAN];
    let mask = [MISSING_MASK_PRESENT, MISSING_MASK_MISSING];

    let counts = NumericColumn::new(&values).with_missing_mask(&mask)
                                            .counts()
                                            .unwrap();

    assert_eq!(counts.valid_count, 1);
}

#[test]
fn a_mask_of_the_wrong_length_returns_the_engines_sentence() {
    let values = [1.0, 2.0, 3.0];
    let mask = [MISSING_MASK_PRESENT, MISSING_MASK_PRESENT];

    let error = NumericColumn::new(&values).with_missing_mask(&mask)
                                           .with_name("age")
                                           .counts()
                                           .unwrap_err();

    assert_eq!(error.kind(), ErrorKind::InvalidArgument);
    assert_eq!(error.message(),
               Some(r#"The values and the missing mask of column "age" differ in length: 3 and 2."#));
}

#[test]
fn a_mask_value_other_than_zero_or_one_is_rejected() {
    let values = [1.0, 2.0, 3.0];
    let mask = [MISSING_MASK_PRESENT, MISSING_MASK_PRESENT, 2];

    let error = NumericColumn::new(&values).with_missing_mask(&mask)
                                           .with_name("age")
                                           .counts()
                                           .unwrap_err();

    assert_eq!(error.message(),
               Some(r#"Row 3 of column "age" has a missing mask value of 2; each element must be 0 or 1."#));
}

#[test]
fn a_non_finite_value_at_a_present_row_is_rejected() {
    // 名前を渡していないので、文面は "the column" と言う。
    let values = [1.0, f64::INFINITY];

    let error = NumericColumn::new(&values).counts().unwrap_err();

    assert_eq!(error.message(),
               Some("Row 2 of the column holds inf; rows not marked missing must hold a finite value."));
}

#[test]
fn the_error_displays_as_the_engines_sentence() {
    let values = [f64::NAN];

    let error = NumericColumn::new(&values).counts().unwrap_err();

    assert_eq!(error.to_string(), error.message().unwrap());
}
