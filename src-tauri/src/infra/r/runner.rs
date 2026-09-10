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

/// R スクリプトを `<input.json> <output.json>` の受け渡し規約で実行し、
/// output.json の中身を返す。cli.R / read_sav.R が共有する配管。
pub fn run_rscript(script_path: &Path,
                   input: &Value)
                   -> Result<String, String> {
    let mut input_file = NamedTempFile::new().map_err(|e| format!("一時ファイル作成失敗: {e}"))?;
    let input_bytes = serde_json::to_vec(input).map_err(|e| format!("JSON 変換失敗: {e}"))?;
    input_file.write_all(&input_bytes)
              .map_err(|e| format!("入力書き込み失敗: {e}"))?;

    let output_file = NamedTempFile::new().map_err(|e| format!("出力ファイル作成失敗: {e}"))?;

    // cwd を src-r/ に固定して .Rprofile を発見させ、renv を activate する。
    // --vanilla は使わない (--no-init-file が含まれ .Rprofile を読まない)。
    // --no-save / --no-restore で workspace の持ち込み/書き出しのみ抑止する。
    let r_dir = script_path.parent()
                           .ok_or_else(|| "R スクリプトの親ディレクトリ解決失敗".to_string())?;
    // cwd は親ディレクトリに固定済み。Rscript は --file 内の空白を ~+~ に
    // 置換するため、ファイル名だけ渡して R 側の source() のパスを壊さない。
    let script_name = script_path.file_name()
                                 .ok_or_else(|| "R スクリプトのファイル名解決失敗".to_string())?;

    let mut command = r_command(r_dir);
    let mut child = command.arg("--no-save")
                           .arg("--no-restore")
                           .arg(script_name)
                           .arg(input_file.path())
                           .arg(output_file.path())
                           .stdin(Stdio::null())
                           .stdout(Stdio::null())
                           .stderr(Stdio::piped())
                           .spawn()
                           .map_err(|e| format!("Rscript 起動失敗 (R の導入と SAI_RSCRIPT の設定を確認してください): {e}"))?;

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

    std::fs::read_to_string(output_file.path()).map_err(|e| format!("出力読込失敗: {e}"))
}

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

        let body = run_rscript(&self.cli_path, &input)?;
        serde_json::from_str::<AnalysisResult>(&body)
            .map_err(|e| format!("R 出力 JSON のパース失敗: {e}\n--- raw ---\n{body}"))
    }
}

/// 配布版は Tauri が解決したリソースの位置だけを使う。
pub fn script_directory(resource_dir: &Path,
                        development: bool)
                        -> PathBuf {
    if development {
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../src-r")
    } else {
        resource_dir.join("r")
    }
}

fn r_command(r_dir: &Path) -> Command {
    let mut command = Command::new(rscript_path());
    command.current_dir(r_dir);
    if r_dir.join("runtime.dcf").is_file() {
        // 配布版は利用者の .Rprofile / .Renviron や renv に依存しない。
        command.arg("--no-environ")
               .arg("--no-site-file")
               .env("R_PROFILE_USER", r_dir.join(".Rprofile"))
               .env_remove("RENV_PROJECT")
               .env_remove("RENV_PROFILE");
    }
    command
}

fn rscript_path() -> PathBuf {
    if let Some(path) = std::env::var_os("SAI_RSCRIPT") {
        return PathBuf::from(path);
    }
    // Finder 起動ではシェルの PATH に Homebrew / CRAN R が含まれないことがある。
    let executable = if cfg!(windows) { "Rscript.exe" } else { "Rscript" };
    if let Some(paths) = std::env::var_os("PATH") {
        for directory in std::env::split_paths(&paths) {
            let path = directory.join(executable);
            if path.is_file() {
                return path;
            }
        }
    }
    #[cfg(target_os = "macos")]
    for path in ["/Library/Frameworks/R.framework/Resources/bin/Rscript",
                 "/opt/homebrew/bin/Rscript",
                 "/usr/local/bin/Rscript"]
    {
        if Path::new(path).is_file() {
            return PathBuf::from(path);
        }
    }
    PathBuf::from(executable)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn packaged_scripts_follow_the_relocated_app() {
        let root = tempfile::tempdir().unwrap();
        let resources = root.path().join("Moved SAI.app/Contents/Resources");
        assert_eq!(script_directory(&resources, false), resources.join("r"));
    }

    #[test]
    #[ignore = "導入済みの R パッケージが必要。RENV_CONFIG_SANDBOX_ENABLED=false で実行"]
    fn real_r_notes_reach_the_frontend() {
        let runner = RRunner::new(script_directory(Path::new("unused"), true).join("cli.R"));
        let table = ParsedTable { headers: vec!["x".into()],
                                  rows: vec![vec!["1".into()], vec!["abc".into()], vec!["3".into()]] };
        let result = runner.run("describe", &table, json!({})).unwrap();
        let note = result.n_note.as_ref().unwrap();
        assert!(note.contains("数値に変換できない値"));
        let frontend = serde_json::to_value(&result).unwrap();
        assert_eq!(frontend["nNote"], *note);
    }

    #[test]
    #[ignore = "pnpm prepare:r と R 本体が必要"]
    fn bundled_runtime_runs_after_relocation() {
        use crate::infra::r::transformer::Transformer;
        use crate::infra::reader::spss::SavReader;
        use std::collections::HashMap;

        fn copy_tree(source: &Path,
                     destination: &Path) {
            std::fs::create_dir_all(destination).unwrap();
            for entry in std::fs::read_dir(source).unwrap() {
                let entry = entry.unwrap();
                let kind = entry.file_type().unwrap();
                assert!(!kind.is_symlink(), "配布物に開発環境へのリンクを残さない");
                let target = destination.join(entry.file_name());
                if kind.is_dir() {
                    copy_tree(&entry.path(), &target);
                } else {
                    std::fs::copy(entry.path(), target).unwrap();
                }
            }
        }

        let source = std::env::var_os("SAI_TEST_R_RESOURCES").map(PathBuf::from)
            .unwrap_or_else(|| Path::new(env!("CARGO_MANIFEST_DIR")).join("resources/r"));
        assert!(source.join("runtime.dcf").is_file(),
                "pnpm prepare:r を実行してください");
        let temporary = tempfile::tempdir().unwrap();
        let resources = temporary.path().join("Moved SAI.app/Contents/Resources");
        let directory = script_directory(&resources, false);
        copy_tree(&source, &directory);

        let result = RRunner::new(directory.join("cli.R")).run("describe",
                                                               &ParsedTable { headers: vec!["x".into()],
                                                                              rows:
                                                                                  vec![vec!["1".into()],
                                                                                       vec!["abc".into()],
                                                                                       vec!["3".into()]] },
                                                               json!({}))
                                                          .unwrap();
        assert!(result.n_note.unwrap().contains("数値に変換できない値"));

        let reversed =
            Transformer::new(directory.join("transform.R")).reverse(&HashMap::from([("x".into(),
                                                                                     vec!["1".into(),
                                                                                          "3".into()])]),
                                                                    1.0,
                                                                    5.0)
                                                           .unwrap();
        assert_eq!(reversed.columns["x"], vec!["5", "3"]);

        let sav_path = temporary.path().join("data.sav");
        let fixture_script = directory.join("fixture.R");
        std::fs::write(
                       &fixture_script,
                       r#"
            args <- commandArgs(trailingOnly = TRUE)
            input <- jsonlite::fromJSON(args[1])
            haven::write_sav(data.frame(x = c(1, NA, 3)), input$path)
            writeLines("{}", args[2])
        "#,
        ).unwrap();
        run_rscript(&fixture_script, &json!({"path": sav_path})).unwrap();
        let table = SavReader::new(directory.join("read_sav.R")).read(&sav_path)
                                                                .unwrap();
        assert_eq!(table.headers, vec!["x"]);
        assert_eq!(table.rows, vec![vec!["1"], vec![""], vec!["3"]]);
    }
}
