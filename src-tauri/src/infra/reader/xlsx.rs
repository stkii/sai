use std::path::Path;

use calamine::{
    Data,
    Reader,
    Xlsx,
    open_workbook,
};

use crate::models::ParsedTable;

pub fn get_sheet_names(path: &Path) -> Result<Vec<String>, String> {
    let workbook: Xlsx<_> = open_workbook(path).map_err(|e| format!("XLSX開封失敗: {e}"))?;
    Ok(workbook.sheet_names())
}

pub fn read_xlsx(path: &Path,
                 sheet_name: &str)
                 -> Result<ParsedTable, String> {
    let mut workbook: Xlsx<_> = open_workbook(path).map_err(|e| format!("XLSX開封失敗: {e}"))?;
    let range = workbook.worksheet_range(sheet_name)
                        .map_err(|e| format!("シート読込失敗: {e}"))?;

    let mut iter = range.rows();
    let headers: Vec<String> = iter.next()
                                   .map(|r| r.iter().map(cell_to_string).collect())
                                   .unwrap_or_default();
    let rows: Vec<Vec<String>> = iter.map(|r| r.iter().map(cell_to_string).collect()).collect();

    Ok(ParsedTable { headers, rows })
}

fn cell_to_string(cell: &Data) -> String {
    match cell {
        Data::Empty => String::new(),
        Data::String(s) => s.clone(),
        Data::Float(f) => f.to_string(),
        Data::Int(i) => i.to_string(),
        Data::Bool(b) => b.to_string(),
        Data::DateTime(dt) => format!("{dt:?}"),
        Data::DateTimeIso(s) => s.clone(),
        Data::DurationIso(s) => s.clone(),
        Data::Error(e) => format!("#ERROR: {e:?}"),
    }
}
