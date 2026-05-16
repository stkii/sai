use std::path::PathBuf;

use tauri::State;

use crate::bootstrap::AppState;
use crate::models::DatasetSummary;

#[tauri::command]
pub fn get_sheets(path: String,
                  state: State<'_, AppState>)
                  -> Result<Vec<String>, String> {
    state.dataset.get_sheets(&PathBuf::from(path))
}

#[tauri::command]
pub fn load_dataset(path: String,
                    sheet: Option<String>,
                    state: State<'_, AppState>)
                    -> Result<DatasetSummary, String> {
    state.dataset.load(&PathBuf::from(path), sheet)
}
