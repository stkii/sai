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

    // 不正な行を黙って捨てると観測が silent に消えるため、fail-fast でエラーにする
    let mut rows: Vec<Vec<String>> = Vec::new();
    for (i, record) in rdr.records().enumerate() {
        // ヘッダ行ぶんを足して実ファイルの行番号 (1-based) に合わせる
        let record = record.map_err(|e| format!("CSV {} 行目の読込失敗: {e}", i + 2))?;
        rows.push(record.iter().map(String::from).collect());
    }

    Ok(ParsedTable { headers, rows })
}
