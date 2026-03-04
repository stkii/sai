use crate::domain::input::table::ParsedDataTable;

#[tauri::command]
pub fn parse_table(state: tauri::State<'_, crate::bootstrap::state::AppState>,
                   path: String,
                   sheet: Option<String>)
                   -> Result<ParsedDataTable, String> {
    let kind = crate::domain::input::source_kind::DataSourceKind::from_path(&path)?;
    let sheet_label = sheet.clone().unwrap_or_else(|| "-".to_string());
    log::info!("data.parse start path={} kind={} sheet={}",
               path,
               kind.as_str(),
               sheet_label);

    let table = state.import_service
                     .parse_table(&path, sheet.as_deref())
                     .map_err(|e| {
                         log::error!("data.parse failed path={} kind={} sheet={} err={}",
                                     path,
                                     kind.as_str(),
                                     sheet_label,
                                     e);
                         e
                     })?;

    log::info!("data.parse ok path={} kind={} sheet={} headers={} rows={}",
               path,
               kind.as_str(),
               sheet_label,
               table.headers.len(),
               table.rows.len());
    Ok(table)
}
