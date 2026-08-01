use std::io::{
    Read,
    Write,
};
use std::path::{
    Path,
    PathBuf,
};
use std::process::{
    Command,
    Stdio,
};
use std::time::Duration;

use serde_json::{
    Value,
    json,
};
use tempfile::NamedTempFile;
use wait_timeout::ChildExt;

use crate::models::{
    AnalysisResult,
    ParsedTable,
};

/// R 子プロセスの実行上限。ハングした R が UI の busy 状態を固定し続けるのを防ぐ。
const R_TIMEOUT: Duration = Duration::from_secs(120);

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

        let mut child = Command::new("Rscript").current_dir(r_dir)
                                               .arg("--no-save")
                                               .arg("--no-restore")
                                               .arg(&self.cli_path)
                                               .arg(input_file.path())
                                               .arg(output_file.path())
                                               .stdin(Stdio::null())
                                               .stdout(Stdio::null())
                                               .stderr(Stdio::piped())
                                               .spawn()
                                               .map_err(|e| format!("Rscript 起動失敗: {e}"))?;

        // stderr は別スレッドで排出し続ける。パイプが埋まって子プロセスが
        // 書き込みブロックするのを防ぐ (内容は失敗時のエラーメッセージにのみ使う)
        let stderr_pipe = child.stderr.take();
        let stderr_thread = std::thread::spawn(move || {
            let mut buf = Vec::new();
            if let Some(mut pipe) = stderr_pipe {
                let _ = pipe.read_to_end(&mut buf);
            }
            buf
        });

        let status = match child.wait_timeout(R_TIMEOUT)
                                .map_err(|e| format!("R プロセスの待機失敗: {e}"))?
        {
            Some(status) => status,
            None => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!("R の実行が {} 秒を超えたため中断しました", R_TIMEOUT.as_secs()));
            },
        };

        let stderr_buf = stderr_thread.join().unwrap_or_default();

        if !status.success() {
            let stderr = String::from_utf8_lossy(&stderr_buf);
            return Err(format!("R 実行失敗 (exit={:?}): {}",
                               status.code(),
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
