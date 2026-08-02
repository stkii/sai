use std::path::{
    Path,
    PathBuf,
};

use serde_json::json;

use crate::infra::r::runner::run_rscript;
use crate::models::ParsedTable;

/// SPSS (.sav) の読込は R (haven::read_spss) に委譲する。
/// read_sav.R が値ラベルを剥がしたコード値を文字列テーブルとして返す。
pub struct SavReader {
    script_path: PathBuf,
}

impl SavReader {
    pub fn new(script_path: PathBuf) -> Self {
        Self { script_path }
    }

    pub fn read(&self,
                path: &Path)
                -> Result<ParsedTable, String> {
        let input = json!({ "path": path.to_string_lossy() });
        let body = run_rscript(&self.script_path, &input)?;
        serde_json::from_str::<ParsedTable>(&body)
            .map_err(|e| format!("SPSS 読込結果のパース失敗: {e}\n--- raw ---\n{body}"))
    }
}
