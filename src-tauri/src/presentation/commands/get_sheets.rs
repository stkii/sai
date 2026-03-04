#[tauri::command]
pub fn get_sheets(state: tauri::State<'_, crate::bootstrap::state::AppState>,
                  path: String)
                  -> Result<Vec<String>, String> {
    log::info!("get_sheets start path={}", path);
    let kind = crate::domain::input::source_kind::DataSourceKind::from_path(&path)?;
    log::info!("get_sheets start path={} kind={}", path, kind.as_str());
    let result = state.import_service.get_sheets(&path);

    match result {
        Ok(names) => {
            log::info!("get_sheets ok path={} count={}", path, names.len());
            Ok(names)
        },
        Err(e) => {
            log::error!("get_sheets failed path={} err={}", path, e);
            Err(e)
        },
    }
}
