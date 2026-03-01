use crate::data::data_source;
use crate::dto::ParsedDataTable;

#[tauri::command]
pub fn get_excel_sheets(path: String) -> Result<Vec<String>, String> {
    log::info!("excel.get_sheets start path={}", path);
    match data_source::get_excel_sheets(&path) {
        Ok(names) => {
            log::info!("excel.get_sheets ok path={} count={}", path, names.len());
            Ok(names)
        },
        Err(e) => {
            log::error!("excel.get_sheets failed path={} err={}", path, e);
            Err(e)
        },
    }
}

#[tauri::command]
pub fn parse_excel(path: String,
                   sheet: String)
                   -> Result<ParsedDataTable, String> {
    log::info!("excel.parse start path={} sheet={}", path, sheet);
    let table = match data_source::parse_excel_table(&path, &sheet) {
        Ok(table) => table,
        Err(e) => {
            log::error!("excel.parse failed path={} sheet={} err={}", path, sheet, e);
            return Err(e);
        },
    };
    log::info!("excel.parse ok path={} sheet={} headers={} rows={}",
               path,
               sheet,
               table.headers.len(),
               table.rows.len());
    Ok(table)
}
