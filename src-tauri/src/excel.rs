use std::collections::HashSet;

use calamine::{
    CellErrorType,
    Data,
    Reader,
    open_workbook_auto,
};

use crate::dto::ParsedTable;

pub fn get_excel_sheets(path: &str) -> Result<Vec<String>, String> {
    let workbook = open_workbook_auto(path).map_err(|e| format!("ファイルを開けません: {}", e))?;

    let names = workbook.sheet_names().clone();

    if names.is_empty() {
        return Err("シート名を取得できません".to_string());
    }

    Ok(names)
}

pub fn read_excel_sheet_rows(
    path: &str,
    sheet: &str,
) -> Result<Vec<Vec<Data>>, String> {
    let mut workbook = open_workbook_auto(path).map_err(|e| format!("ファイルを開けません: {}", e))?;

    let range = workbook
        .worksheet_range(sheet)
        .map_err(|e| format!("指定されたシートを読み込めません: {}", e))?;

    Ok(range.rows().map(|r| r.to_vec()).collect())
}

pub fn create_parsed_table(rows_data: Vec<Vec<Data>>) -> Result<ParsedTable, String> {
    if rows_data.is_empty() {
        return Ok(ParsedTable {
            headers: vec![],
            rows: vec![],
        });
    }

    let headers = compute_headers_from_first_row(&rows_data[0])?;

    let rows = rows_data
        .into_iter()
        .skip(1)
        .map(|row| {
            let values: Vec<serde_json::Value> = row
                .into_iter()
                .map(|cell| match cell {
                    // もともと値が存在しないケース
                    Data::Empty => serde_json::Value::Null,

                    Data::String(s) => {
                        if s.trim().is_empty() {
                            serde_json::Value::Null
                        } else {
                            serde_json::Value::String(s)
                        }
                    },

                    Data::Float(f) => {
                        if f.is_nan() {
                            // NaN 判定
                            serde_json::Value::String("NaN!".to_string())
                        } else if f.is_infinite() {
                            // 無限に発散するケース
                            if f.is_sign_negative() {
                                serde_json::Value::String("-Inf!".to_string())
                            } else {
                                serde_json::Value::String("Inf!".to_string())
                            }
                        } else {
                            // 通常の値
                            serde_json::Number::from_f64(f)
                                .map(serde_json::Value::Number)
                                // パース失敗 (NA!; Not Available)
                                .unwrap_or_else(|| serde_json::Value::String("NA!".to_string()))
                        }
                    },

                    #[allow(deprecated)]
                    Data::Int(n) => serde_json::Value::from(n),

                    Data::Bool(b) => serde_json::Value::Bool(b),

                    // DateTimeIso を優先し、DateTime は文字列化
                    Data::DateTime(dt) => serde_json::Value::String(dt.to_string()),
                    Data::DateTimeIso(s) => serde_json::Value::String(s),
                    Data::DurationIso(s) => serde_json::Value::String(s),

                    // Excelのエラーを種類に応じて文字列化
                    Data::Error(e) => serde_json::Value::String(excel_error_to_str(e.clone()).to_string()),
                })
                .collect();

            values
        })
        .collect();

    Ok(ParsedTable { headers, rows })
}

fn compute_headers_from_first_row(row0: &[Data]) -> Result<Vec<String>, String> {
    let headers: Vec<String> = row0
        .iter()
        .enumerate()
        .map(|(i, cell)| match cell {
            Data::String(s) => {
                let trimmed = s.trim();
                if trimmed.is_empty() {
                    format!("COLUMN_{}", i + 1)
                } else {
                    trimmed.to_string()
                }
            },
            Data::Float(f) => {
                if f.is_nan() {
                    "NaN!".to_string()
                } else if f.is_infinite() {
                    if f.is_sign_negative() {
                        "-Inf!".to_string()
                    } else {
                        "Inf!".to_string()
                    }
                } else {
                    serde_json::Number::from_f64(*f)
                        .map(|n| n.to_string())
                        .unwrap_or_else(|| format!("COLUMN_{}", i + 1))
                }
            },
            #[allow(deprecated)]
            Data::Int(n) => n.to_string(),
            // Boolean は文字列にフォールバック
            Data::Bool(_) => "TRUE/FALSE".to_string(),
            // 日付・時刻・期間のデータ
            // DateTimeIso を優先し、DateTime は文字列化
            Data::DateTime(dt) => dt.to_string(),
            Data::DateTimeIso(s) => s.to_string(),
            Data::DurationIso(s) => s.to_string(),
            // 欠損は自動列名にフォールバック
            Data::Empty => format!("COLUMN_{}", i + 1),
            // Excelエラー
            Data::Error(e) => excel_error_to_str(e.clone()).to_string(),
        })
        .collect();

    // 重複ヘッダー検出
    let mut seen: HashSet<&str> = HashSet::new();
    let mut dups: Vec<String> = Vec::new();
    for h in headers.iter() {
        let key = h.as_str();
        if !seen.insert(key) {
            if !dups.iter().any(|d| d == h) {
                dups.push(h.clone());
            }
        }
    }
    if !dups.is_empty() {
        return Err(format!(
            "シートのヘッダー（列名）が重複しています: {}",
            dups.join(", ")
        ));
    }

    Ok(headers)
}

fn excel_error_to_str(e: CellErrorType) -> &'static str {
    match e {
        // Division by zero
        CellErrorType::Div0 => "#DIV/0!",
        // Value not available
        CellErrorType::NA => "#N/A",
        // Invalid name
        CellErrorType::Name => "#NAME?",
        // Null value
        CellErrorType::Null => "#NULL!",
        // Numeric error
        CellErrorType::Num => "#NUM!",
        // Invalid cell reference
        CellErrorType::Ref => "#REF!",
        // Value error
        CellErrorType::Value => "#VALUE!",
        // Retrieving data
        CellErrorType::GettingData => "#GETTING",
    }
}
