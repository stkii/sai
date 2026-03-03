#[tauri::command]
pub fn get_sheets(path: String) -> Result<Vec<String>, String> {
    log::info!("get_sheets start path={}", path);
    let kind = crate::usecase::DataSourceKind::from_path(&path)?;
    log::info!("get_sheets start path={} kind={}", path, kind.as_str());
    let result = crate::usecase::get_sheets(kind, &path);

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
