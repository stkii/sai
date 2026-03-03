use calamine::{
    CellErrorType,
    Data,
    Reader,
    open_workbook_auto,
};
use indexmap::IndexMap;

use super::{
    numeric,
    utils,
};

use crate::dto::ParsedDataTable;

pub(crate) fn build_numeric_dataset_from_xlsx(rows_data: Vec<Vec<Data>>,
                                              variables: &[String])
                                              -> Result<IndexMap<String, Vec<Option<f64>>>, String> {
    if rows_data.is_empty() {
        return Err("Sheet is empty".to_string());
    }
    if variables.is_empty() {
        return Err("No variables selected".to_string());
    }

    let headers = compute_headers_from_first_row(&rows_data[0])?;
    let selected_columns = utils::collect_ordered_selected_columns(&headers, variables)?;
    let row_count = rows_data.len().saturating_sub(1);

    let mut dataset = IndexMap::with_capacity(selected_columns.len());
    for (header, _) in selected_columns.iter() {
        dataset.insert(header.clone(), Vec::with_capacity(row_count));
    }

    for (row_index, row) in rows_data.iter().skip(1).enumerate() {
        for (header, col_index) in selected_columns.iter() {
            let cell = row.get(*col_index);
            let value = numeric::parse_xlsx_numeric_cell(cell,
                                                         numeric::NumericCellContext::new(row_index,
                                                                                          *col_index,
                                                                                          header))?;
            dataset.get_mut(header)
                   .expect("dataset column exists")
                   .push(value);
        }
    }

    Ok(dataset)
}

/// Build a parsed data table (headers + rows) from raw sheet rows.
pub(crate) fn create_parsed_data_table(rows_data: Vec<Vec<Data>>) -> Result<ParsedDataTable, String> {
    if rows_data.is_empty() {
        return Ok(ParsedDataTable { headers: vec![],
                                    rows: vec![],
                                    note: None,
                                    title: None });
    }

    let headers = compute_headers_from_first_row(&rows_data[0])?;

    let rows = rows_data.into_iter()
                        .skip(1)
                        .map(|row| row.into_iter().map(cell_value_to_json_value).collect())
                        .collect();

    let normalized = utils::normalize_rows(rows, headers.len());

    Ok(ParsedDataTable { headers,
                         rows: normalized.rows,
                         note: normalized.note,
                         title: None })
}

/// Read sheet names from an Excel file.
pub(crate) fn get_xlsx_sheets(path: &str) -> Result<Vec<String>, String> {
    let workbook = open_workbook_auto(path).map_err(|e| format!("Failed to open file: {}", e))?;

    let names = workbook.sheet_names().clone();

    if names.is_empty() {
        return Err("Failed to get sheet names".to_string());
    }

    Ok(names)
}

/// Load all rows from a specific sheet.
pub(crate) fn read_xlsx_sheet_rows(path: &str,
                                   sheet: &str)
                                   -> Result<Vec<Vec<Data>>, String> {
    let mut workbook = open_workbook_auto(path).map_err(|e| format!("Failed to open file: {}", e))?;

    let range = workbook.worksheet_range(sheet)
                        .map_err(|e| format!("Failed to read sheet: {}", e))?;

    Ok(range.rows().map(|r| r.to_vec()).collect())
}

/// Convert a cell value into a header name string.
fn cell_value_to_header_name(cell: &Data,
                             col_index: usize)
                             -> String {
    match cell {
        Data::String(s) => {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                format!("col_{}", col_index + 1)
            } else {
                trimmed.to_string()
            }
        },
        Data::Float(f) => {
            if let Some(s) = special_value_to_str(*f) {
                s.to_string()
            } else {
                serde_json::Number::from_f64(*f).map(|n| n.to_string())
                                                .unwrap_or_else(|| format!("col_{}", col_index + 1))
            }
        },
        #[allow(deprecated)]
        Data::Int(n) => n.to_string(),
        // Boolean to string fallback
        Data::Bool(_) => "TRUE/FALSE".to_string(),
        // Date, Time, Duration
        Data::DateTime(dt) => dt.to_string(),
        Data::DateTimeIso(s) => s.to_string(),
        Data::DurationIso(s) => s.to_string(),
        // Empty to automatic column name fallback
        Data::Empty => format!("col_{}", col_index + 1),
        // Return string according to the type of Excel error
        Data::Error(e) => error_to_str(e).to_string(),
    }
}

/// Convert a cell value into a JSON-compatible value.
fn cell_value_to_json_value(cell: Data) -> serde_json::Value {
    match cell {
        Data::Empty => serde_json::Value::Null,

        Data::String(s) => {
            if s.trim().is_empty() {
                serde_json::Value::Null
            } else {
                serde_json::Value::String(s)
            }
        },

        Data::Float(f) => {
            if let Some(s) = special_value_to_str(f) {
                serde_json::Value::String(s.to_string())
            } else {
                serde_json::Number::from_f64(f).map(serde_json::Value::Number)
                                               .unwrap_or(serde_json::Value::Null)
            }
        },

        #[allow(deprecated)]
        Data::Int(n) => serde_json::Value::from(n),

        Data::Bool(b) => serde_json::Value::Bool(b),

        Data::DateTime(dt) => serde_json::Value::String(dt.to_string()),
        Data::DateTimeIso(s) => serde_json::Value::String(s),
        Data::DurationIso(s) => serde_json::Value::String(s),

        // Return string according to the type of Excel error
        Data::Error(e) => serde_json::Value::String(error_to_str(&e).to_string()),
    }
}

/// Normalize headers from the first row and check duplicates.
/// This function is the single source of truth for header naming rules.
fn compute_headers_from_first_row(row0: &[Data]) -> Result<Vec<String>, String> {
    let headers: Vec<String> = row0.iter()
                                   .enumerate()
                                   .map(|(i, cell)| cell_value_to_header_name(cell, i))
                                   .collect();

    utils::validate_unique_headers(&headers)?;

    Ok(headers)
}

/// Map Excel error types to their string codes.
fn error_to_str(e: &CellErrorType) -> &'static str {
    match e {
        // Division by zero
        CellErrorType::Div0 => "#DIV/0!",
        // Value not available
        CellErrorType::NA => "#N/A!",
        // Invalid name
        CellErrorType::Name => "#NAME!",
        // Null value
        CellErrorType::Null => "#NULL!",
        // Numeric error
        CellErrorType::Num => "#NUM!",
        // Invalid cell reference
        CellErrorType::Ref => "#REF!",
        // Value error
        CellErrorType::Value => "#VALUE!",
        // Retrieving data
        CellErrorType::GettingData => "#GETTING!",
    }
}

/// Return a string for NaN/Infinity values if applicable.
fn special_value_to_str(f: f64) -> Option<&'static str> {
    if f.is_nan() {
        return Some("NaN!");
    }
    if f.is_infinite() {
        return Some(if f.is_sign_negative() { "-Inf!" } else { "Inf!" });
    }
    None
}
