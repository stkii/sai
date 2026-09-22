//! 表示用テーブルの文字列セルを、エンジンの入力契約に合う値と欠損マスクへ変換する。

use sai_engine::{
    MISSING_MASK_MISSING,
    MISSING_MASK_PRESENT,
};

/// エンジンへ渡す1列ぶんの入力。欠損行の値は読まれないので任意の詰め物でよい。
#[derive(Debug)]
pub struct NumericColumnData {
    pub values: Vec<f64>,
    pub missing_mask: Vec<u8>,
}

/// 欠損行に置く詰め物。エンジンはマスクが立った行の値を読まない。
const MISSING_PLACEHOLDER: f64 = 0.0;

/// 空欄だけを欠損として受け入れ、数値として読めない値はエラーにする。
///
/// R 経路は数値化に失敗した値を黙って欠損にして注記を添えていた。欠測の多い
/// データと、数値でない列を選んだこととが見分けられないため、こちらでは位置を
/// 示して拒否する。仕様の違いとして docs/CPP_ENGINE_MIGRATION.md に記録がある。
pub fn to_numeric_column<'a>(variable: &str,
                             cells: impl IntoIterator<Item = &'a str>)
                             -> Result<NumericColumnData, String> {
    let mut values = Vec::new();
    let mut missing_mask = Vec::new();

    for (index, cell) in cells.into_iter().enumerate() {
        let text = cell.trim();
        if text.is_empty() {
            values.push(MISSING_PLACEHOLDER);
            missing_mask.push(MISSING_MASK_MISSING);
            continue;
        }
        // 利用者が目にするのは 1 始まりの行番号。
        let row = index + 1;
        let value: f64 =
            text.parse()
                .map_err(|_| format!("変数 '{variable}' の {row} 行目 '{text}' を数値として読めません"))?;
        if !value.is_finite() {
            return Err(format!("変数 '{variable}' の {row} 行目 '{text}' は有限の数値ではありません"));
        }
        values.push(value);
        missing_mask.push(MISSING_MASK_PRESENT);
    }

    Ok(NumericColumnData { values, missing_mask })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_every_cell_as_a_present_value() {
        let column = to_numeric_column("age", ["1", "2.5", "-3e2"]).unwrap();

        assert_eq!(column.values, vec![1.0, 2.5, -300.0]);
        assert_eq!(column.missing_mask, vec![MISSING_MASK_PRESENT; 3]);
    }

    #[test]
    fn treats_a_blank_cell_as_missing() {
        let column = to_numeric_column("age", ["1", "", "  ", "4"]).unwrap();

        assert_eq!(column.missing_mask,
                   vec![MISSING_MASK_PRESENT,
                        MISSING_MASK_MISSING,
                        MISSING_MASK_MISSING,
                        MISSING_MASK_PRESENT]);
    }

    #[test]
    fn names_the_row_of_a_value_it_cannot_read() {
        let error = to_numeric_column("age", ["1", "2", "many"]).unwrap_err();

        assert!(error.contains("age"), "{error}");
        assert!(error.contains("3 行目"), "{error}");
        assert!(error.contains("many"), "{error}");
    }

    #[test]
    fn rejects_a_value_that_is_not_finite() {
        let error = to_numeric_column("age", ["1", "inf"]).unwrap_err();

        assert!(error.contains("有限"), "{error}");
    }

    #[test]
    fn an_r_style_missing_marker_is_not_silently_accepted() {
        // "NA" を欠損として受け入れると、値の綴りが違う列を選んだことが
        // 欠測として見えてしまう。
        assert!(to_numeric_column("age", ["1", "NA"]).is_err());
    }
}
