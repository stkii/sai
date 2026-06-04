use std::path::Path;

use crate::models::ParsedTable;

pub fn read_csv(path: &Path) -> Result<ParsedTable, String> {
    let mut rdr = csv::ReaderBuilder::new().has_headers(true)
                                           .from_path(path)
                                           .map_err(|e| format!("CSV読込失敗: {e}"))?;

    let headers = rdr.headers()
                     .map_err(|e| format!("ヘッダ読込失敗: {e}"))?
                     .iter()
                     .map(String::from)
                     .collect();

    let rows = rdr.records()
                  .filter_map(Result::ok)
                  .map(|r| r.iter().map(String::from).collect())
                  .collect();

    Ok(ParsedTable { headers, rows })
}
