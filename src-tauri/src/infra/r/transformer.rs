use std::collections::HashMap;
use std::path::PathBuf;

use serde_json::json;

use crate::infra::r::runner::run_rscript;
use crate::models::TransformResult;

/// 派生列の計算は R (transform.R) に委譲する。
/// 分析と同じ数値化 (.CoerceNumeric) を通すため、プレビューに見えている値と
/// 分析が扱う値の解釈がずれない。
pub struct Transformer {
    script_path: PathBuf,
}

impl Transformer {
    pub fn new(script_path: PathBuf) -> Self {
        Self { script_path }
    }

    pub fn reverse(&self,
                   columns: &HashMap<String, Vec<String>>,
                   scale_min: f64,
                   scale_max: f64)
                   -> Result<TransformResult, String> {
        let input = json!({
            "kind": "reverse",
            "columns": columns,
            "scale_min": scale_min,
            "scale_max": scale_max,
        });

        let body = run_rscript(&self.script_path, &input)?;
        serde_json::from_str::<TransformResult>(&body)
            .map_err(|e| format!("変換結果のパース失敗: {e}\n--- raw ---\n{body}"))
    }
}
