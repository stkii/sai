use crate::domain::input::source_kind::DataSourceKind;

#[tauri::command]
pub fn build_string_mixed_dataset(state: tauri::State<'_, crate::bootstrap::state::AppState>,
                                  path: String,
                                  sheet: Option<String>,
                                  variables: Vec<String>)
                                  -> Result<String, String> {
    let kind = DataSourceKind::from_path(&path)?;
    let sheet_label = sheet.clone().unwrap_or_else(|| "-".to_string());
    log::info!("analysis.build_string_mixed_dataset start path={} kind={} sheet={} vars={}",
               path,
               kind.as_str(),
               sheet_label,
               variables.len());

    let built = state.import_service
                     .build_string_mixed_dataset(&path, sheet.as_deref(), &variables)
                     .map_err(|e| {
                         log::error!("analysis.build_string_mixed_dataset failed path={} kind={} sheet={} err={}",
                                     path,
                                     kind.as_str(),
                                     sheet_label,
                                     e);
                         e
                     })?;

    log::info!("analysis.build_string_mixed_dataset ok path={} kind={} sheet={} dataset_cache_id={} vars={} rows={}",
               path,
               kind.as_str(),
               built.sheet_name,
               built.dataset_cache_id,
               built.variable_count,
               built.row_count);

    Ok(built.dataset_cache_id)
}
