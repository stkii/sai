//! 記述統計の要求を C++ エンジンへ渡し、型付きの結果へ組み立てる。
//!
//! 統計量の定義と、値が返らない条件はエンジンが持つ。ここが決めるのは、どの列を
//! 渡すか、設定の文字列をどう解釈するか、表示の並び順だけ。

use sai_engine::{
    Descriptive,
    DescriptiveOptions,
    DiagnosticCode,
    ENGINE_NAME,
    NumericColumn,
    engine_version,
};
use serde_json::Value;

use crate::analysis::numeric::to_numeric_column;
use crate::models::{
    AnalysisResult,
    DescriptiveAppliedOptions,
    DescriptiveColumn,
    DescriptiveReport,
    EngineIdentity,
    ParsedTable,
    ResultDiagnostic,
    TypedResult,
};

const SORT_DEFAULT: &str = "default";
const SORT_MEAN_DESCENDING: &str = "mean_desc";
const SORT_MEAN_ASCENDING: &str = "mean_asc";

pub fn run(table: &ParsedTable,
           options: &Value)
           -> Result<AnalysisResult, String> {
    if table.headers.is_empty() {
        return Err("変数が選択されていません".into());
    }
    let sort = sort_mode(options)?;
    let engine_options = DescriptiveOptions { include_skewness: extra(options, "skewness"),
                                              include_kurtosis: extra(options, "kurtosis") };

    let mut columns = Vec::with_capacity(table.headers.len());
    for (index, variable) in table.headers.iter().enumerate() {
        columns.push(describe_column(table, index, variable, engine_options)?);
    }
    sort_columns(&mut columns, sort);

    let applied = DescriptiveAppliedOptions { sort: sort.to_string(),
                                              include_skewness: engine_options.include_skewness,
                                              include_kurtosis: engine_options.include_kurtosis };
    Ok(AnalysisResult { // 旧形式の整形済みの表は返さない。表の見出しと桁数は画面が決める。
                        sections: Vec::new(),
                        n: Some(table.rows.len()),
                        n_note: None,
                        typed: Some(TypedResult::Describe(DescriptiveReport { columns,
                                                                              applied_options:
                                                                                  applied })),
                        engine: Some(EngineIdentity { name: ENGINE_NAME.to_string(),
                                                      version: Some(engine_version().to_string()) }) })
}

fn describe_column(table: &ParsedTable,
                   index: usize,
                   variable: &str,
                   options: DescriptiveOptions)
                   -> Result<DescriptiveColumn, String> {
    let cells = table.rows.iter().map(|row| row[index].as_str());
    let input = to_numeric_column(variable, cells)?;

    let described = NumericColumn::new(&input.values).with_missing_mask(&input.missing_mask)
                                                     .with_name(variable)
                                                     .describe(options)
                                                     .map_err(|e| format!("変数 '{variable}' の記述統計を計算できません: {e}"))?;
    to_column(variable, &described)
}

fn to_column(variable: &str,
             described: &Descriptive)
             -> Result<DescriptiveColumn, String> {
    Ok(DescriptiveColumn { variable: variable.to_string(),
                           total_count: described.total_count,
                           valid_count: described.valid_count,
                           missing_count: described.missing_count,
                           mean: representable(variable, "mean", described.mean)?,
                           standard_deviation: representable(variable,
                                                             "standard_deviation",
                                                             described.standard_deviation)?,
                           minimum: representable(variable, "minimum", described.minimum)?,
                           median: representable(variable, "median", described.median)?,
                           maximum: representable(variable, "maximum", described.maximum)?,
                           skewness: representable(variable, "skewness", described.skewness)?,
                           kurtosis: representable(variable, "kurtosis", described.kurtosis)?,
                           diagnostics: described.diagnostics
                                                 .iter()
                                                 .map(|d| ResultDiagnostic { code: diagnostic_code(d.code),
                                                                             target: d.target.clone(),
                                                                             count: d.count })
                                                 .collect() })
}

/// JSON は NaN と無限大を表せず、serde_json はそれらを `null` にする。値がない
/// ことと区別が付かなくなるので、エンジンの契約どおり有限であることを確かめる。
fn representable(variable: &str,
                 field: &str,
                 value: Option<f64>)
                 -> Result<Option<f64>, String> {
    match value {
        Some(v) if !v.is_finite() => {
            Err(format!("変数 '{variable}' の {field} にエンジンが有限でない値を返しました"))
        },
        other => Ok(other),
    }
}

/// 画面の表示文は診断コードから組み立てられる。知らないコードを既知のものへ
/// 寄せると、返らなかった理由が別のものにすり替わるので値のまま渡す。
fn diagnostic_code(code: DiagnosticCode) -> String {
    match code {
        DiagnosticCode::InsufficientObservations => "insufficient_observations".to_string(),
        DiagnosticCode::VarianceTooSmall => "variance_too_small".to_string(),
        DiagnosticCode::NotRepresentable => "not_representable".to_string(),
        DiagnosticCode::Unrecognized(value) => format!("unrecognized_{value}"),
    }
}

fn sort_mode(options: &Value) -> Result<&'static str, String> {
    match options.get("sort").and_then(Value::as_str) {
        None | Some(SORT_DEFAULT) => Ok(SORT_DEFAULT),
        Some(SORT_MEAN_DESCENDING) => Ok(SORT_MEAN_DESCENDING),
        Some(SORT_MEAN_ASCENDING) => Ok(SORT_MEAN_ASCENDING),
        Some(other) => Err(format!("未対応の表示順: {other}")),
    }
}

fn extra(options: &Value,
         name: &str)
         -> bool {
    options.get("extras")
           .and_then(|e| e.get(name))
           .and_then(Value::as_bool)
           .unwrap_or(false)
}

/// 平均を持たない列は、どちらの向きでも最後に置く。並べ替えは表示の順序だけを
/// 変え、どの値にも触れない。
fn sort_columns(columns: &mut [DescriptiveColumn],
                sort: &str) {
    if sort == SORT_DEFAULT {
        return;
    }
    let descending = sort == SORT_MEAN_DESCENDING;
    // 同じ平均の列は変数リストの順を保つ。
    columns.sort_by(|left, right| match (left.mean, right.mean) {
               (Some(a), Some(b)) => {
                   let order = a.partial_cmp(&b).expect("有限であることは確認済み");
                   if descending { order.reverse() } else { order }
               },
               (Some(_), None) => std::cmp::Ordering::Less,
               (None, Some(_)) => std::cmp::Ordering::Greater,
               (None, None) => std::cmp::Ordering::Equal,
           });
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn table(headers: &[&str],
             rows: &[&[&str]])
             -> ParsedTable {
        ParsedTable { headers: headers.iter().map(|h| (*h).to_string()).collect(),
                      rows: rows.iter()
                                .map(|row| row.iter().map(|c| (*c).to_string()).collect())
                                .collect() }
    }

    fn report(table: &ParsedTable,
              options: &Value)
              -> DescriptiveReport {
        match run(table, options).unwrap().typed {
            Some(TypedResult::Describe(report)) => report,
            None => panic!("型付き結果が付いていない"),
        }
    }

    fn sample() -> ParsedTable {
        table(&["x", "y"],
              &[&["1", "10"],
                &["2", "20"],
                &["3", "30"],
                &["4", "40"],
                &["5", "50"]])
    }

    #[test]
    fn describes_every_selected_variable_in_the_order_it_was_given() {
        let report = report(&sample(), &json!({}));

        let variables: Vec<&str> = report.columns.iter().map(|c| c.variable.as_str()).collect();
        assert_eq!(variables, ["x", "y"]);
        assert_eq!(report.columns[0].mean, Some(3.0));
        assert_eq!(report.columns[1].mean, Some(30.0));
        assert_eq!(report.columns[0].valid_count, 5);
    }

    #[test]
    fn a_shape_statistic_is_computed_only_when_it_was_asked_for() {
        let options = json!({"extras": {"skewness": true}});

        let report = report(&sample(), &options);

        assert_eq!(report.applied_options,
                   DescriptiveAppliedOptions { sort: SORT_DEFAULT.to_string(),
                                               include_skewness: true,
                                               include_kurtosis: false });
        assert!(report.columns[0].skewness.is_some());
        assert_eq!(report.columns[0].kurtosis, None);
        // 頼まなかった値に理由は付かない。
        assert!(report.columns[0].diagnostics.is_empty());
    }

    #[test]
    fn a_value_the_data_cannot_support_arrives_with_its_reason() {
        let short = table(&["x"], &[&["1"], &["2"]]);

        let report = report(&short, &json!({"extras": {"kurtosis": true}}));

        assert_eq!(report.columns[0].kurtosis, None);
        assert_eq!(report.columns[0].diagnostics,
                   vec![ResultDiagnostic { code: "insufficient_observations".to_string(),
                                           target: "kurtosis".to_string(),
                                           count: 2 }]);
    }

    #[test]
    fn a_blank_cell_is_missing_and_is_counted_per_variable() {
        let with_gap = table(&["x", "y"], &[&["1", "10"], &["", "20"], &["3", "30"]]);

        let report = report(&with_gap, &json!({}));

        assert_eq!(report.columns[0].total_count, 3);
        assert_eq!(report.columns[0].valid_count, 2);
        assert_eq!(report.columns[0].missing_count, 1);
        assert_eq!(report.columns[1].missing_count, 0);
    }

    #[test]
    fn sorts_by_mean_and_leaves_a_variable_without_one_last() {
        // y は全欠損なので平均を持たない。
        let mixed = table(&["x", "y", "z"], &[&["1", "", "9"], &["2", "", "9"]]);

        let report = report(&mixed, &json!({"sort": "mean_desc"}));

        let variables: Vec<&str> = report.columns.iter().map(|c| c.variable.as_str()).collect();
        assert_eq!(variables, ["z", "x", "y"]);
        assert_eq!(report.applied_options.sort, SORT_MEAN_DESCENDING);
    }

    #[test]
    fn sorting_the_other_way_keeps_a_variable_without_a_mean_last() {
        let mixed = table(&["x", "y", "z"], &[&["1", "", "9"], &["2", "", "9"]]);

        let report = report(&mixed, &json!({"sort": "mean_asc"}));

        let variables: Vec<&str> = report.columns.iter().map(|c| c.variable.as_str()).collect();
        assert_eq!(variables, ["x", "z", "y"]);
    }

    #[test]
    fn rejects_a_display_order_it_does_not_know() {
        let error = run(&sample(), &json!({"sort": "median_desc"})).unwrap_err();

        assert!(error.contains("median_desc"), "{error}");
    }

    #[test]
    fn rejects_a_cell_it_cannot_read_rather_than_calling_it_missing() {
        let dirty = table(&["x"], &[&["1"], &["約2"]]);

        let error = run(&dirty, &json!({})).unwrap_err();

        assert!(error.contains("'x'"), "{error}");
        assert!(error.contains("2 行目"), "{error}");
    }

    #[test]
    fn rejects_an_empty_selection() {
        let error = run(&table(&[], &[]), &json!({})).unwrap_err();

        assert!(error.contains("選択されていません"), "{error}");
    }

    #[test]
    fn the_result_says_which_engine_produced_it() {
        let result = run(&sample(), &json!({})).unwrap();

        let engine = result.engine.expect("エンジンが記録されていない");
        assert_eq!(engine.name, ENGINE_NAME);
        assert!(engine.version.is_some_and(|v| !v.is_empty()));
    }

    #[test]
    fn an_absent_value_reaches_the_frontend_as_null_beside_its_reason() {
        let constant = table(&["x"], &[&["4"], &["4"], &["4"], &["4"]]);

        let result = run(&constant, &json!({"extras": {"skewness": true}})).unwrap();
        let json = serde_json::to_value(&result).unwrap();

        let column = &json["typed"]["columns"][0];
        assert_eq!(json["typed"]["method"], "describe");
        assert_eq!(column["standardDeviation"], 0.0);
        assert!(column["skewness"].is_null());
        assert_eq!(column["diagnostics"][0]["code"], "variance_too_small");
        // 整形済みの表は返さないので、画面は型付き結果だけを読む。
        assert_eq!(json["sections"].as_array().map(Vec::len), Some(0));
    }
}
