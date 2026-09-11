use std::sync::Arc;

use serde_json::Value;

use crate::infra::cache::dataset_cache::DatasetCache;
use crate::infra::r::runner::RRunner;
use crate::models::{
    AnalysisResult,
    ParsedTable,
};

pub struct AnalysisService {
    cache: Arc<DatasetCache>,
    runner: RRunner,
}

impl AnalysisService {
    pub fn new(cache: Arc<DatasetCache>,
               runner: RRunner)
               -> Self {
        Self { cache, runner }
    }

    pub fn run(&self,
               dataset_key: Option<&str>,
               method: &str,
               variables: &[String],
               options: Option<Value>)
               -> Result<AnalysisResult, String> {
        let options = match options {
            Some(v) if !v.is_null() => v,
            _ => Value::Object(Default::default()),
        };

        let table = match dataset_key {
            Some(key) => {
                let raw = self.cache
                              .get(key)
                              .ok_or_else(|| "データセットが見つかりません (キャッシュ切れ)".to_string())?;
                let matrix_input = method == "mds" && options["source"] == "matrix";
                project_columns(&raw, variables, matrix_input)?
            },
            None => empty_table(),
        };

        self.runner.run(method, &table, options)
    }
}

fn empty_table() -> ParsedTable {
    ParsedTable { headers: Vec::new(),
                  rows: Vec::new() }
}

fn project_columns(table: &ParsedTable,
                   variables: &[String],
                   source_order: bool)
                   -> Result<ParsedTable, String> {
    if variables.is_empty() {
        return Err("変数が選択されていません".into());
    }
    let mut indices: Vec<usize> = variables.iter()
                                           .map(|v| {
                                               table.headers
                                                    .iter()
                                                    .position(|h| h == v)
                                                    .ok_or_else(|| format!("変数 '{v}' が見つかりません"))
                                           })
                                           .collect::<Result<_, _>>()?;
    // 行列の行は元データ順。列だけ選択順にすると別の非類似度行列になってしまう。
    if source_order {
        indices.sort_unstable();
    }

    let headers = indices.iter().map(|&i| table.headers[i].clone()).collect();
    let rows = table.rows
                    .iter()
                    .map(|row| indices.iter().map(|&i| row[i].clone()).collect())
                    .collect();
    Ok(ParsedTable { headers, rows })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn table() -> ParsedTable {
        ParsedTable { headers: vec!["a".into(), "b".into(), "c".into()],
                      rows: vec![vec!["1".into(), "2".into(), "3".into()],
                                 vec!["4".into(), "5".into(), "6".into()]] }
    }

    #[test]
    fn projects_selected_columns_in_order() {
        let projected = project_columns(&table(), &["c".into(), "a".into()], false).unwrap();
        assert_eq!(projected.headers, vec!["c", "a"]);
        assert_eq!(projected.rows, vec![vec!["3", "1"], vec!["6", "4"]]);
    }

    #[test]
    fn rejects_empty_selection() {
        let err = project_columns(&table(), &[], false).unwrap_err();
        assert!(err.contains("選択されていません"));
    }

    #[test]
    fn rejects_unknown_variable() {
        let err = project_columns(&table(), &["a".into(), "z".into()], false).unwrap_err();
        assert!(err.contains("'z'"));
    }

    #[test]
    fn matrix_selection_preserves_row_column_correspondence() {
        let matrix = ParsedTable { headers: vec!["A".into(), "B".into(), "C".into()],
                                   rows: vec![vec!["0".into(), "1".into(), "4".into()],
                                              vec!["1".into(), "0".into(), "5".into()],
                                              vec!["4".into(), "5".into(), "0".into()]] };
        let projected = project_columns(&matrix, &["B".into(), "A".into(), "C".into()], true).unwrap();
        assert_eq!(projected.headers, matrix.headers);
        assert_eq!(projected.rows, matrix.rows);
    }
}
