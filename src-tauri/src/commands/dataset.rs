use std::path::PathBuf;

use tauri::State;

use crate::bootstrap::AppState;
use crate::models::{
    CreateVariableResult,
    LoadedDataset,
    VariableSpec,
};

#[tauri::command]
pub async fn get_sheets(path: String,
                        state: State<'_, AppState>)
                        -> Result<Vec<String>, String> {
    let dataset = state.dataset.clone();
    tauri::async_runtime::spawn_blocking(move || dataset.get_sheets(&PathBuf::from(path)))
        .await.map_err(|e| format!("シート一覧の取得失敗: {e}"))?
}

#[tauri::command]
pub async fn load_dataset(path: String,
                          sheet: Option<String>,
                          state: State<'_, AppState>)
                          -> Result<LoadedDataset, String> {
    let dataset = state.dataset.clone();
    tauri::async_runtime::spawn_blocking(move || dataset.load(&PathBuf::from(path), sheet))
        .await.map_err(|e| format!("データセットの読込失敗: {e}"))?
}

#[tauri::command]
pub async fn create_variable(dataset_key: String,
                             spec: VariableSpec,
                             state: State<'_, AppState>)
                             -> Result<CreateVariableResult, String> {
    let dataset = state.dataset.clone();
    tauri::async_runtime::spawn_blocking(move || dataset.create_variable(&dataset_key, &spec))
        .await.map_err(|e| format!("変数の作成失敗: {e}"))?
}
