use serde_json::Value;

use crate::infra::cache::dataset_cache::DatasetCache;
use crate::infra::r::runner::{
    RRunner,
    default_cli_path,
};
use crate::models::{
    AnalysisResult,
    ParsedTable,
};

pub struct AnalysisService {
    runner: RRunner,
}

impl AnalysisService {
    pub fn new() -> Self {
        Self { runner: RRunner::new(default_cli_path()) }
    }

    pub fn run(&self,
               cache: &DatasetCache,
               dataset_key: Option<&str>,
               method: &str,
               variables: &[String],
               options: Value)
               -> Result<AnalysisResult, String> {
        let normalized = if options.is_null() {
            Value::Object(Default::default())
        } else {
            options
        };

        let table = match dataset_key {
            Some(key) => {
                let raw = cache.get(key)
                               .ok_or_else(|| "データセットが見つかりません (キャッシュ切れ)".to_string())?;
                project_columns(&raw, variables)?
            },
            None => empty_table(),
        };

        self.runner.run(method, &table, normalized)
    }
}

impl Default for AnalysisService {
    fn default() -> Self {
        Self::new()
    }
}

fn empty_table() -> ParsedTable {
    ParsedTable { headers: Vec::new(),
                  rows: Vec::new() }
}

fn project_columns(table: &ParsedTable,
                   variables: &[String])
                   -> Result<ParsedTable, String> {
    if variables.is_empty() {
        return Err("変数が選択されていません".into());
    }
    let indices: Vec<usize> = variables.iter()
                                       .map(|v| {
                                           table.headers
                                                .iter()
                                                .position(|h| h == v)
                                                .ok_or_else(|| format!("変数 '{v}' が見つかりません"))
                                       })
                                       .collect::<Result<_, _>>()?;

    let headers = indices.iter().map(|&i| table.headers[i].clone()).collect();
    let rows = table.rows
                    .iter()
                    .map(|row| indices.iter().map(|&i| row[i].clone()).collect())
                    .collect();
    Ok(ParsedTable { headers, rows })
}
