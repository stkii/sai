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
use tauri::AppHandle;
use tempfile::NamedTempFile;
use wait_timeout::ChildExt;

use crate::dto::ParsedTable;
use crate::excel;

fn default_header(index: usize) -> String {
    format!("列{}", index + 1)
}

fn header_from_cell(
    cell: &Data,
    index: usize,
) -> String {
    let s = match cell {
        Data::String(s) => s.trim().to_string(),
        Data::Float(f) => match serde_json::Number::from_f64(*f) {
            Some(n) => n.to_string(),
            None => String::new(),
        },
        #[allow(deprecated)]
        Data::Int(n) => n.to_string(),
        Data::Bool(b) => {
            if *b {
                "TRUE".into()
            } else {
                "FALSE".into()
            }
        },
        Data::Empty | Data::Error(_) => String::new(),
        other => other.to_string(),
    };
    let s = s.trim();
    if s.is_empty() {
        default_header(index)
    } else {
        s.to_string()
    }
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

    // ヘッダー生成
    let header_row = &rows[0];
    let headers: Vec<String> = header_row
        .iter()
        .enumerate()
        .map(|(i, cell)| header_from_cell(cell, i))
        .collect();

    // 重複ヘッダー検出（元の文言を維持）
    {
        let mut counts: HashMap<&str, usize> = HashMap::new();
        for h in &headers {
            *counts.entry(h.as_str()).or_default() += 1;
        }
        let dups: Vec<&str> = counts
            .into_iter()
            .filter_map(|(k, c)| (c > 1).then_some(k))
            .collect();
        if !dups.is_empty() {
            return Err(format!(
                "シートのヘッダー（列名）が重複しています: {}",
                dups.join(", ")
            ));
        }
    }

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
    order: Option<&str>,
    timeout: Duration,
) -> Result<ParsedTable, String> {
    // 一時ファイル（入力/出力、自動クリーンアップ）
    let mut in_tf = NamedTempFile::new().map_err(|e| format!("一時ファイルの作成に失敗しました: {e}"))?;
    serde_json::to_writer(&mut in_tf, dataset).map_err(|e| e.to_string())?;
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

    if let Some(ord) = order {
        if !ord.is_empty() {
            cmd.arg(ord);
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
