use std::time::Duration;

use indexmap::IndexMap;
use tauri::{
    AppHandle,
    Emitter,
    Manager,
    WebviewUrl,
    WebviewWindowBuilder,
};

use crate::dto::ParsedTable;
use crate::{
    excel,
    r,
    temp_store,
};

#[derive(serde::Deserialize)]
struct ResultPayloadCheck {
    #[allow(dead_code)]
    token: Option<String>,
    #[allow(dead_code)]
    analysis: Option<String>,
    #[allow(dead_code)]
    path: Option<String>,
    #[allow(dead_code)]
    sheet: Option<String>,
    #[allow(dead_code)]
    variables: Option<Vec<String>>,
    #[allow(dead_code)]
    params: Option<serde_json::Value>,
    #[allow(dead_code)]
    dataset: Option<IndexMap<String, Vec<Option<f64>>>>,
}

fn validate_result_payload(v: &serde_json::Value) -> Result<(), String> {
    serde_json::from_value::<ResultPayloadCheck>(v.clone())
        .map(|_| ())
        .map_err(|e| format!("result payload invalid: {}", e))
}

// ----- Excel -----

#[tauri::command]
pub fn get_excel_sheets(path: String) -> Result<Vec<String>, String> {
    excel::get_excel_sheets(&path)
}

#[tauri::command]
pub fn parse_excel(
    path: String,
    sheet: String,
) -> Result<ParsedTable, String> {
    let rows = excel::read_excel_sheet_rows(&path, &sheet)?;
    let table = excel::create_parsed_table(rows)?;
    table.validate()?;
    Ok(table)
}

// ----- R analysis -----

#[tauri::command]
pub fn build_numeric_dataset(
    path: String,
    sheet: String,
    variables: Vec<String>,
) -> Result<IndexMap<String, Vec<Option<f64>>>, String> {
    r::build_numeric_dataset(&path, &sheet, &variables)
}

#[tauri::command]
pub fn run_r_analysis_with_dataset(
    app: tauri::AppHandle,
    analysis: String,
    dataset: IndexMap<String, Vec<Option<f64>>>,
    options_json: Option<String>,
    timeout_ms: u64,
) -> Result<ParsedTable, String> {
    let table = r::run_r_analysis_with_dataset(
        &app,
        &analysis,
        &dataset,
        options_json.as_deref(),
        Duration::from_millis(timeout_ms),
    )?;
    table.validate()?;
    Ok(table)
}

// ----- Window -----

#[tauri::command]
pub fn open_or_reuse_window(
    handle: AppHandle,
    label: String,
    url: String,
    payload: Option<serde_json::Value>,
) -> Result<(), String> {
    let is_analysis = label.as_str() == "analysis";
    // 分析パネルは毎回新規作成。既存があれば閉じる。
    // 結果ビューアは蓄積ビューのため再利用し、payload をイベントで渡す。
    if is_analysis {
        if let Some(win) = handle.get_webview_window(&label) {
            let _ = win.close();
        }
    } else if let Some(win) = handle.get_webview_window(&label) {
        // 既存ウィンドウを再利用（パネル以外）
        let _ = win.set_focus();
        match label.as_str() {
            "result" => {
                if let Some(data) = payload {
                    // 受信ペイロードの簡易バリデーション（型崩れを早期検出）
                    if let Err(e) = validate_result_payload(&data) {
                        return Err(e);
                    }
                    win.emit("result:load", data).map_err(|e| e.to_string())?;
                }
            },
            "analysis" => {
                if let Some(data) = payload {
                    // 分析パネル用の受信ペイロード検証（緩め）
                    if let Err(e) = validate_result_payload(&data) {
                        return Err(e);
                    }
                    win.emit("analysis:load", data).map_err(|e| e.to_string())?;
                }
            },
            _ => {},
        }
        return Ok(());
    }

    // 新規作成時のウィンドウ属性はラベルで決定
    let mut builder = WebviewWindowBuilder::new(&handle, &label, WebviewUrl::App(url.into()));
    match label.as_str() {
        "analysis" => {
            builder = builder
                .title("SAI - (Analysis Panel)")
                .inner_size(720.0, 540.0)
                .min_inner_size(700.0, 520.0);
        },
        "result" => {
            builder = builder
                .title("SAI - (Result Viewer)")
                .inner_size(800.0, 600.0)
                .min_inner_size(700.0, 520.0);
        },
        _ => {
            // デフォルト: タイトルのみ指定（サイズは既定に委ねる）
            builder = builder.title(label.clone());
        },
    }

    let win = builder.build().map_err(|e| e.to_string())?;

    // 新規作成時にも初期データをイベントで渡す
    if let Some(data) = payload {
        match label.as_str() {
            "result" => {
                if let Err(e) = validate_result_payload(&data) {
                    return Err(e);
                }
                win.emit("result:load", data).map_err(|e| e.to_string())?;
            },
            "analysis" => {
                if let Err(e) = validate_result_payload(&data) {
                    return Err(e);
                }
                win.emit("analysis:load", data).map_err(|e| e.to_string())?;
            },
            _ => {},
        }
    }

    Ok(())
}

// ----- Temp result token -----

#[tauri::command]
pub fn issue_result_token(result: ParsedTable) -> Result<String, String> {
    let ttl = std::time::Duration::from_secs(300); // 5 minutes
    result.validate()?;
    let val = serde_json::to_value(result).map_err(|e| e.to_string())?;
    Ok(temp_store::issue(val, ttl))
}

#[tauri::command]
pub fn consume_result_token(token: String) -> Result<ParsedTable, String> {
    let val = temp_store::consume(&token)?;
    let table = serde_json::from_value::<ParsedTable>(val).map_err(|e| e.to_string())?;
    table.validate()?;
    Ok(table)
}

// ----- File export / Logging -----

#[tauri::command]
pub fn save_text_file(
    path: String,
    contents: String,
) -> Result<(), String> {
    use std::io::Write;
    use std::path::Path;

    let path = Path::new(&path);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut f = std::fs::File::create(path).map_err(|e| e.to_string())?;
    f.write_all(contents.as_bytes()).map_err(|e| e.to_string())?;
    f.flush().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn append_analysis_log(
    app: tauri::AppHandle,
    entry: serde_json::Value,
) -> Result<(), String> {
    use std::fs::{
        self,
        OpenOptions,
    };
    use std::io::Write;
    // Resolve app-local data dir
    let base_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("failed to resolve app_local_data_dir: {}", e))?;
    let logs_dir = base_dir.join("analysis-logs");
    fs::create_dir_all(&logs_dir).map_err(|e| e.to_string())?;

    let log_file = logs_dir.join("analysis-log.jsonl");
    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
        .map_err(|e| e.to_string())?;

    let line = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
    f.write_all(line.as_bytes()).map_err(|e| e.to_string())?;
    f.write_all(b"\n").map_err(|e| e.to_string())?;
    f.flush().map_err(|e| e.to_string())
}
