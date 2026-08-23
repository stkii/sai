use std::path::PathBuf;

use tauri::State;

use crate::bootstrap::AppState;
use crate::models::{
    CreateVariableResult,
    LoadedDataset,
    VariableSpec,
};

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

#[tauri::command]
pub fn create_variable(dataset_key: String,
                       spec: VariableSpec,
                       state: State<'_, AppState>)
                       -> Result<CreateVariableResult, String> {
    state.dataset.create_variable(&dataset_key, &spec)
}
