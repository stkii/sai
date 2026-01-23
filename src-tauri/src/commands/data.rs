use crate::dto::ParsedDataTable;
use crate::types::DataSourceKind;
use crate::{
    csv,
    excel,
};

#[tauri::command]
pub fn get_sheets(path: String) -> Result<Vec<String>, String> {
    let kind = DataSourceKind::from_path(&path)?;
    log::info!("data.get_sheets start path={} kind={}", path, kind.as_str());

    let result = match kind {
        DataSourceKind::Csv => Ok(vec![]),
        DataSourceKind::Excel => excel::get_excel_sheets(&path),
    };

    match result {
        Ok(names) => {
            log::info!("data.get_sheets ok path={} kind={} count={}",
                       path,
                       kind.as_str(),
                       names.len());
            Ok(names)
        },
        Err(e) => {
            log::error!("data.get_sheets failed path={} kind={} err={}",
                        path,
                        kind.as_str(),
                        e);
            Err(e)
        },
    }
}

#[tauri::command]
pub fn parse_table(path: String,
                   sheet: Option<String>)
                   -> Result<ParsedDataTable, String> {
    let kind = DataSourceKind::from_path(&path)?;
    let sheet_label = sheet.clone().unwrap_or_else(|| "-".to_string());
    log::info!("data.parse start path={} kind={} sheet={}",
               path,
               kind.as_str(),
               sheet_label);

    let table = match kind {
        DataSourceKind::Csv => csv::parse_csv_table(&path),
        DataSourceKind::Excel => {
            let sheet = sheet.ok_or_else(|| "Sheet is required for Excel file".to_string())?;
            let rows = excel::read_excel_sheet_rows(&path, &sheet)?;
            excel::create_parsed_data_table(rows)
        },
    }?;

    if let Err(e) = table.validate() {
        log::error!("data.parse validate_failed path={} kind={} sheet={} err={}",
                    path,
                    kind.as_str(),
                    sheet_label,
                    e);
        return Err(e);
    }

    log::info!("data.parse ok path={} kind={} sheet={} headers={} rows={}",
               path,
               kind.as_str(),
               sheet_label,
               table.headers.len(),
               table.rows.len());
    Ok(table)
}
