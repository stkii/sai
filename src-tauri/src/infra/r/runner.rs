use std::io::Write;
use std::path::{
    Path,
    PathBuf,
};
use std::process::Command;

use serde_json::{
    Value,
    json,
};
use tempfile::NamedTempFile;

use crate::models::{
    AnalysisResult,
    ParsedTable,
};

pub struct RRunner {
    cli_path: PathBuf,
}

impl RRunner {
    pub fn new(cli_path: PathBuf) -> Self {
        Self { cli_path }
    }

    pub fn run(&self,
               method: &str,
               table: &ParsedTable,
               options: Value)
               -> Result<AnalysisResult, String> {
        let input = json!({
            "method": method,
            "headers": table.headers,
            "rows": table.rows,
            "options": options,
        });

        let mut input_file = NamedTempFile::new().map_err(|e| format!("一時ファイル作成失敗: {e}"))?;
        let input_bytes = serde_json::to_vec(&input).map_err(|e| format!("JSON 変換失敗: {e}"))?;
        input_file.write_all(&input_bytes)
                  .map_err(|e| format!("入力書き込み失敗: {e}"))?;

        let output_file = NamedTempFile::new().map_err(|e| format!("出力ファイル作成失敗: {e}"))?;

        // cwd を src-r/ に固定して .Rprofile を発見させ、renv を activate する。
        // --vanilla は使わない (--no-init-file が含まれ .Rprofile を読まない)。
        // --no-save / --no-restore で workspace の持ち込み/書き出しのみ抑止する。
        let r_dir = self.cli_path
                        .parent()
                        .ok_or_else(|| "cli.R の親ディレクトリ解決失敗".to_string())?;

        let output = Command::new("Rscript").current_dir(r_dir)
                                            .arg("--no-save")
                                            .arg("--no-restore")
                                            .arg(&self.cli_path)
                                            .arg(input_file.path())
                                            .arg(output_file.path())
                                            .output()
                                            .map_err(|e| format!("Rscript 起動失敗: {e}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("R 実行失敗 (exit={:?}): {}",
                               output.status.code(),
                               stderr.trim()));
        }

        let body = std::fs::read_to_string(output_file.path()).map_err(|e| format!("出力読込失敗: {e}"))?;
        serde_json::from_str::<AnalysisResult>(&body)
            .map_err(|e| format!("R 出力 JSON のパース失敗: {e}\n--- raw ---\n{body}"))
    }
}

pub fn default_cli_path() -> PathBuf {
    // src-tauri/ の親 (= プロジェクトルート) / src-r / cli.R
    let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    manifest_dir.parent()
                .map(|root| root.join("src-r").join("cli.R"))
                .unwrap_or_else(|| PathBuf::from("src-r/cli.R"))
}
