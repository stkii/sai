use std::path::PathBuf;

use tauri::State;

use crate::bootstrap::AppState;
use crate::models::LoadedDataset;

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
                    -> Result<LoadedDataset, String> {
    state.dataset.load(&PathBuf::from(path), sheet)
}
