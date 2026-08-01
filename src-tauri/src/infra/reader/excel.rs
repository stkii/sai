use std::path::Path;

use calamine::{
    Data,
    Reader,
    open_workbook_auto,
};

use crate::models::ParsedTable;

// open_workbook_auto はファイル内容から形式を判別するため、
// ZIP ベースの .xlsx と CFB バイナリの .xls の両方を開ける。

pub fn get_sheet_names(path: &Path) -> Result<Vec<String>, String> {
    let workbook = open_workbook_auto(path).map_err(|e| format!("ワークブック開封失敗: {e}"))?;
    Ok(workbook.sheet_names())
}

pub fn read_excel(path: &Path,
                  sheet_name: &str)
                  -> Result<ParsedTable, String> {
    let mut workbook = open_workbook_auto(path).map_err(|e| format!("ワークブック開封失敗: {e}"))?;
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
