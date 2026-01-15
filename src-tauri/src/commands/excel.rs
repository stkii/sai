use crate::dto::ParsedDataTable;
use crate::excel;

#[tauri::command]
pub fn get_excel_sheets(path: String) -> Result<Vec<String>, String> {
    log::info!("excel.get_sheets start path={}", path);
    match excel::get_excel_sheets(&path) {
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
    let rows = match excel::read_excel_sheet_rows(&path, &sheet) {
        Ok(rows) => rows,
        Err(e) => {
            log::error!("excel.parse read_failed path={} sheet={} err={}", path, sheet, e);
            return Err(e);
        },
    };
    let table = match excel::create_parsed_data_table(rows) {
        Ok(table) => table,
        Err(e) => {
            log::error!("excel.parse build_failed path={} sheet={} err={}", path, sheet, e);
            return Err(e);
        },
    };
    if let Err(e) = table.validate() {
        log::error!("excel.parse validate_failed path={} sheet={} err={}",
                    path,
                    sheet,
                    e);
        return Err(e);
    }
    log::info!("excel.parse ok path={} sheet={} headers={} rows={}",
               path,
               sheet,
               table.headers.len(),
               table.rows.len());
    Ok(table)
}
