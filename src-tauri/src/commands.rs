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
    excel::create_parsed_table(rows)
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
    order: Option<String>,
    timeout_ms: u64,
) -> Result<ParsedTable, String> {
    r::run_r_analysis_with_dataset(
        &app,
        &analysis,
        &dataset,
        order.as_deref(),
        Duration::from_millis(timeout_ms),
    )
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
    let is_result = label.as_str() == "result";
    // 分析パネルと結果ビューアは毎回新規作成。既存があれば閉じる。
    // 結果ビューアはURLのクエリ（token）に依存するため、再利用だとURLが更新されず
    // 古いtokenを参照してしまう。MVPでは毎回作り直して安全側に倒す。
    if is_analysis || is_result {
        if let Some(win) = handle.get_webview_window(&label) {
            let _ = win.close();
        }
    } else if let Some(win) = handle.get_webview_window(&label) {
        // 既存ウィンドウを再利用（パネル以外）
        let _ = win.set_focus();
        match label.as_str() {
            "result" => {
                if let Some(data) = payload {
                    win.emit("result:load", data).map_err(|e| e.to_string())?;
                }
            },
            "analysis" => {
                if let Some(data) = payload {
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
            builder = builder.title("SAI - (Analysis Panel)");
            builder = builder.inner_size(600.0, 450.0);
            builder = builder.resizable(false);
        },
        "result" => {
            builder = builder.title("SAI - (Result Viewer)");
            builder = builder.inner_size(800.0, 600.0);
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
                win.emit("result:load", data).map_err(|e| e.to_string())?;
            },
            "analysis" => {
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
    let val = serde_json::to_value(result).map_err(|e| e.to_string())?;
    Ok(temp_store::issue(val, ttl))
}

#[tauri::command]
pub fn consume_result_token(token: String) -> Result<ParsedTable, String> {
    let val = temp_store::consume(&token)?;
    serde_json::from_value::<ParsedTable>(val).map_err(|e| e.to_string())
}
