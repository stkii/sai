use indexmap::IndexMap;
use std::collections::{
    HashMap,
    HashSet,
};
use std::io::Write as _;
use std::path::PathBuf;
use std::process::{
    Command,
    Stdio,
};
use std::time::Duration;

use calamine::Data;
use serde::{
    Deserialize,
    Serialize,
};
use tauri::AppHandle;
use tempfile::NamedTempFile;
use wait_timeout::ChildExt;

use crate::dto::ParsedTable;
use crate::excel;

// IPC options typed on Rust side, converted later for R CLI
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(untagged)]
enum AnalysisOptions {
    Correlation {
        methods: Vec<String>,
        alt: String,
        #[serde(rename = "use")]
        r#use: String,
        #[serde(default)]
        columns: Vec<String>,
    },
    Descriptive {
        order: String,
        #[serde(default)]
        columns: Vec<String>,
    },
}

fn to_f64_opt(cell: &Data) -> Option<f64> {
    match cell {
        Data::Float(f) => Some(*f),
        #[allow(deprecated)]
        Data::Int(n) => Some(*n as f64),
        Data::String(s) => s.trim().parse::<f64>().ok(),
        _ => None,
    }
}

pub fn build_numeric_dataset(
    path: &str,
    sheet: &str,
    variables: &[String],
) -> Result<IndexMap<String, Vec<Option<f64>>>, String> {
    if variables.is_empty() {
        return Err("変数が選択されていません".to_string());
    }

    let rows = excel::read_excel_sheet_rows(path, sheet)?;
    if rows.is_empty() {
        return Err("指定シートにデータがありません".to_string());
    }

    // ヘッダー生成（excel.rs に集約された実装を利用）
    let header_row = &rows[0];
    let headers: Vec<String> = excel::compute_headers_from_first_row(header_row)?;

    // 変数存在確認（ヘッダー順の仕様は維持。存在確認は O(1) 用にマップ化）
    let header_index: HashMap<&str, usize> =
        headers.iter().enumerate().map(|(i, h)| (h.as_str(), i)).collect();
    for v in variables {
        if !header_index.contains_key(v.as_str()) {
            return Err(format!("変数 '{}' が見つかりません", v));
        }
    }

    // 抽出順はヘッダーの並び順を維持（UIの選択順ではない）
    let varset: HashSet<&str> = variables.iter().map(|s| s.as_str()).collect();
    let mut indices: Vec<(String, usize)> = Vec::new();
    for (idx, name) in headers.iter().enumerate() {
        if varset.contains(name.as_str()) {
            indices.push((name.clone(), idx));
        }
    }

    // データセット構築
    let mut dataset: IndexMap<String, Vec<Option<f64>>> = IndexMap::new();
    for (name, idx) in indices.into_iter() {
        let mut col: Vec<Option<f64>> = Vec::with_capacity(rows.len().saturating_sub(1));
        let mut any_some = false;
        for row in rows.iter().skip(1) {
            let num = row.get(idx).and_then(to_f64_opt);
            if num.is_some() {
                any_some = true;
            }
            col.push(num);
        }
        if any_some {
            dataset.insert(name, col);
        }
    }

    if dataset.is_empty() {
        return Err("全ての選択列が数値または文字列として解釈できませんでした".to_string());
    }

    Ok(dataset)
}

fn find_cli_script() -> Option<PathBuf> {
    if let Ok(p) = std::env::var("SAI_R_CLI") {
        let path = PathBuf::from(p);
        if path.exists() {
            return Some(path);
        }
    }
    for rel in [
        "src-r/cli.R",
        "../src-r/cli.R",
        "../../src-r/cli.R",
        "../../../src-r/cli.R",
    ] {
        if let Ok(cwd) = std::env::current_dir() {
            let p = cwd.join(rel);
            if p.exists() {
                return Some(p);
            }
        }
    }
    None
}

/// Excelから抽出済みの数値データセットをJSON化し一時ファイルへ書き込み
/// src-r/cli.R を Rscript --vanilla で起動し、分析モードを渡して実行
/// Rの標準出力(JSON)を受け取り ParsedTable にデコードして返却
pub fn run_r_analysis_with_dataset(
    _handle: &AppHandle,
    analysis: &str,
    dataset: &IndexMap<String, Vec<Option<f64>>>,
    options_json: Option<&str>,
    timeout: Duration,
) -> Result<ParsedTable, String> {
    // 一時ファイル（入力/出力、自動クリーンアップ）
    let mut in_tf = NamedTempFile::new().map_err(|e| format!("一時ファイルの作成に失敗しました: {e}"))?;

    // 列順ヒント: options_json に columns があれば優先、それ以外は dataset のキー順
    let mut order: Vec<String> = dataset.keys().cloned().collect();
    if let Some(raw) = options_json {
        if !raw.is_empty() {
            if let Ok(opts) = serde_json::from_str::<AnalysisOptions>(raw) {
                match opts {
                    AnalysisOptions::Correlation { columns, .. }
                    | AnalysisOptions::Descriptive { columns, .. } => {
                        if !columns.is_empty() {
                            order = columns;
                        }
                    },
                }
            }
        }
    }
    let root = serde_json::json!({
        "__order": order,
        "__data": dataset,
    });
    serde_json::to_writer(&mut in_tf, &root).map_err(|e| e.to_string())?;
    in_tf.flush().ok();
    let out_tf = NamedTempFile::new().map_err(|e| format!("一時ファイルの作成に失敗しました: {e}"))?;

    let script =
        find_cli_script().ok_or_else(|| "R CLI スクリプトが見つかりません: src-r/cli.R".to_string())?;

    let root_src_r = script
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| PathBuf::from("src-r"));

    let mut cmd = Command::new("Rscript");
    cmd.arg("--vanilla")
        .arg(&script)
        .arg(analysis)
        .arg(in_tf.path())
        .arg(out_tf.path())
        .env("LC_ALL", "C")
        .env("R_PROJECT_ROOT", &root_src_r)
        .stderr(Stdio::piped());

    // options_json をRust側で型付けして検証し、R CLI へ適切に引き渡す
    if let Some(raw) = options_json {
        if !raw.is_empty() {
            match serde_json::from_str::<AnalysisOptions>(raw) {
                Ok(AnalysisOptions::Descriptive { order, .. }) => {
                    if !order.trim().is_empty() {
                        cmd.arg(order);
                    }
                },
                Ok(AnalysisOptions::Correlation {
                    methods, alt, r#use, ..
                }) => {
                    // 正規化してから JSON で渡す
                    let opts = serde_json::json!({
                        "methods": methods,
                        "alt": alt,
                        "use": r#use,
                    });
                    let s = serde_json::to_string(&opts).map_err(|e| e.to_string())?;
                    cmd.arg(s);
                },
                Err(_) => {
                    // 型付けに失敗した場合は生文字列をそのまま渡して後段で扱う
                    cmd.arg(raw);
                },
            }
        }
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Rscript の起動に失敗しました: {e}"))?;

    match child.wait_timeout(timeout).map_err(|e| e.to_string())? {
        Some(status) => {
            // 既に終了しているので出力を取得
            let output = child.wait_with_output().map_err(|e| e.to_string())?;
            if !status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!(
                    "R 実行に失敗しました (code: {:?}): {}",
                    status.code(),
                    stderr.trim()
                ));
            }
            // R 側が out_tf へ JSON を書き出す想定
            let json_txt = std::fs::read_to_string(out_tf.path())
                .map_err(|e| format!("R出力ファイルの読み取りに失敗しました: {e}"))?;
            let parsed: ParsedTable = serde_json::from_str(&json_txt)
                .map_err(|e| format!("R出力のJSONパースに失敗しました: {}\n出力: {}", e, json_txt))?;
            Ok(parsed)
        },
        None => {
            let _ = child.kill();
            Err(format!("R 実行がタイムアウトしました: {:?}", timeout))
        },
    }
}
