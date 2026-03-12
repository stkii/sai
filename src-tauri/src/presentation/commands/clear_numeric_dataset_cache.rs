#[tauri::command]
pub fn clear_numeric_dataset_cache(state: tauri::State<'_, crate::bootstrap::state::AppState>)
                                   -> Result<(), String> {
    log::info!("analysis.clear_numeric_dataset_cache start");
    state.import_service.clear_numeric_dataset_cache()?;
    log::info!("analysis.clear_numeric_dataset_cache ok");
    Ok(())
}
