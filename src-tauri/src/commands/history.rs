use tauri::State;

use crate::bootstrap::AppState;
use crate::models::HistoryRecord;

#[tauri::command]
pub fn load_history(state: State<'_, AppState>) -> Result<Vec<HistoryRecord>, String> {
    state.history.load_all()
}

#[tauri::command]
pub fn append_history(record: HistoryRecord,
                      state: State<'_, AppState>)
                      -> Result<(), String> {
    state.history.append(&record)
}

#[tauri::command]
pub fn clear_history(state: State<'_, AppState>) -> Result<(), String> {
    state.history.clear()
}

#[tauri::command]
pub fn remove_history(id: String,
                      state: State<'_, AppState>)
                      -> Result<(), String> {
    state.history.remove(&id)
}
