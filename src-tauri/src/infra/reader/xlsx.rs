use calamine::{
    CellErrorType,
    Data,
    Reader,
    open_workbook_auto,
};

use crate::domain::input::numeric::{
    NumericCellContext,
    NumericDataset,
    parse_finite_number,
    parse_numeric_string,
};
use crate::domain::input::table::{
    ParsedDataTable,
    collect_ordered_selected_columns,
    normalize_rows,
    validate_unique_headers,
};

pub(super) fn build_numeric_dataset_from_xlsx(rows_data: Vec<Vec<Data>>,
                                              variables: &[String])
                                              -> Result<NumericDataset, String> {
    if rows_data.is_empty() {
        return Err("Sheet is empty".to_string());
    }
    if variables.is_empty() {
        return Err("No variables selected".to_string());
    }

    let headers = compute_headers_from_first_row(&rows_data[0])?;
    let selected_columns = collect_ordered_selected_columns(&headers, variables)?;
    let row_count = rows_data.len().saturating_sub(1);

    let mut dataset = NumericDataset::with_capacity(selected_columns.len());
    for (header, _) in &selected_columns {
        dataset.insert(header.clone(), Vec::with_capacity(row_count));
    }

    for (row_index, row) in rows_data.iter().skip(1).enumerate() {
        for (header, col_index) in &selected_columns {
            let cell = row.get(*col_index);
            let value =
                parse_xlsx_numeric_cell(cell, NumericCellContext::new(row_index, *col_index, header))?;
            dataset.get_mut(header)
                   .expect("dataset column exists")
                   .push(value);
        }
    }

    Ok(dataset)
}

pub(super) fn build_string_mixed_dataset_from_xlsx(rows_data: Vec<Vec<Data>>,
                                                    variables: &[String])
                                                    -> Result<crate::domain::input::string_mixed::StringMixedDataset, String> {
    if rows_data.is_empty() {
        return Err("Sheet is empty".to_string());
    }
    if variables.is_empty() {
        return Err("No variables selected".to_string());
    }

    let headers = compute_headers_from_first_row(&rows_data[0])?;
    let selected_columns = collect_ordered_selected_columns(&headers, variables)?;
    let row_count = rows_data.len().saturating_sub(1);

    let mut dataset = crate::domain::input::string_mixed::StringMixedDataset::with_capacity(selected_columns.len());
    for (header, _) in &selected_columns {
        dataset.insert(header.clone(), Vec::with_capacity(row_count));
    }

    for row in rows_data.iter().skip(1) {
        for (header, col_index) in &selected_columns {
            let value = row.get(*col_index).and_then(xlsx_cell_to_string);
            dataset.get_mut(header)
                   .expect("dataset column exists")
                   .push(value);
        }
    }

    Ok(dataset)
}

pub(super) fn create_parsed_data_table(rows_data: Vec<Vec<Data>>) -> Result<ParsedDataTable, String> {
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
    let normalized = normalize_rows(rows, headers.len());

    Ok(ParsedDataTable { headers,
                         rows: normalized.rows,
                         note: normalized.note,
                         title: None })
}

pub(super) fn get_xlsx_sheets(path: &str) -> Result<Vec<String>, String> {
    let workbook = open_workbook_auto(path).map_err(|e| format!("Failed to open file: {}", e))?;
    let names = workbook.sheet_names().clone();
    if names.is_empty() {
        return Err("Failed to get sheet names".to_string());
    }
    Ok(names)
}

pub(super) fn read_xlsx_sheet_rows(path: &str,
                                   sheet: &str)
                                   -> Result<Vec<Vec<Data>>, String> {
    let mut workbook = open_workbook_auto(path).map_err(|e| format!("Failed to open file: {}", e))?;
    let range = workbook.worksheet_range(sheet)
                        .map_err(|e| format!("Failed to read sheet: {}", e))?;
    Ok(range.rows().map(|row| row.to_vec()).collect())
}

fn parse_xlsx_numeric_cell(cell: Option<&Data>,
                           context: NumericCellContext<'_>)
                           -> Result<Option<f64>, String> {
    match cell {
        None => Ok(None),
        Some(Data::Empty) => Ok(None),
        Some(Data::String(value)) => parse_numeric_string(value, context),
        Some(Data::Float(value)) => parse_finite_number(*value, context),
        #[allow(deprecated)]
        Some(Data::Int(value)) => Ok(Some(*value as f64)),
        Some(Data::Bool(_)) => Err(context.error("boolean value is not allowed")),
        Some(Data::DateTime(_)) | Some(Data::DateTimeIso(_)) | Some(Data::DurationIso(_)) => {
            Err(context.error("datetime value is not allowed"))
        },
        Some(Data::Error(_)) => Err(context.error("cell has an Excel error")),
    }
}

fn xlsx_cell_to_string(cell: &Data) -> Option<String> {
    match cell {
        Data::Empty => None,
        Data::String(value) => {
            let trimmed = value.trim();
            if trimmed.is_empty() { None } else { Some(trimmed.to_string()) }
        },
        Data::Float(value) => {
            if let Some(special) = special_value_to_str(*value) {
                Some(special.to_string())
            } else {
                Some(value.to_string())
            }
        },
        #[allow(deprecated)]
        Data::Int(value) => Some(value.to_string()),
        Data::Bool(value) => Some(value.to_string()),
        Data::DateTime(value) => Some(value.to_string()),
        Data::DateTimeIso(value) => Some(value.clone()),
        Data::DurationIso(value) => Some(value.clone()),
        Data::Error(value) => Some(error_to_str(value).to_string()),
    }
}

fn compute_headers_from_first_row(row0: &[Data]) -> Result<Vec<String>, String> {
    let headers: Vec<String> = row0.iter()
                                   .enumerate()
                                   .map(|(index, cell)| cell_value_to_header_name(cell, index))
                                   .collect();
    validate_unique_headers(&headers)?;
    Ok(headers)
}

fn cell_value_to_header_name(cell: &Data,
                             col_index: usize)
                             -> String {
    match cell {
        Data::String(value) => {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                format!("col_{}", col_index + 1)
            } else {
                trimmed.to_string()
            }
        },
        Data::Float(value) => {
            if let Some(special) = special_value_to_str(*value) {
                special.to_string()
            } else {
                serde_json::Number::from_f64(*value).map(|number| number.to_string())
                                                    .unwrap_or_else(|| format!("col_{}", col_index + 1))
            }
        },
        #[allow(deprecated)]
        Data::Int(value) => value.to_string(),
        Data::Bool(_) => "TRUE/FALSE".to_string(),
        Data::DateTime(value) => value.to_string(),
        Data::DateTimeIso(value) => value.to_string(),
        Data::DurationIso(value) => value.to_string(),
        Data::Empty => format!("col_{}", col_index + 1),
        Data::Error(value) => error_to_str(value).to_string(),
    }
}

fn cell_value_to_json_value(cell: Data) -> serde_json::Value {
    match cell {
        Data::Empty => serde_json::Value::Null,
        Data::String(value) => {
            if value.trim().is_empty() {
                serde_json::Value::Null
            } else {
                serde_json::Value::String(value)
            }
        },
        Data::Float(value) => {
            if let Some(special) = special_value_to_str(value) {
                serde_json::Value::String(special.to_string())
            } else {
                serde_json::Number::from_f64(value).map(serde_json::Value::Number)
                                                   .unwrap_or(serde_json::Value::Null)
            }
        },
        #[allow(deprecated)]
        Data::Int(value) => serde_json::Value::from(value),
        Data::Bool(value) => serde_json::Value::Bool(value),
        Data::DateTime(value) => serde_json::Value::String(value.to_string()),
        Data::DateTimeIso(value) => serde_json::Value::String(value),
        Data::DurationIso(value) => serde_json::Value::String(value),
        Data::Error(value) => serde_json::Value::String(error_to_str(&value).to_string()),
    }
}

fn error_to_str(error: &CellErrorType) -> &'static str {
    match error {
        CellErrorType::Div0 => "#DIV/0!",
        CellErrorType::NA => "#N/A!",
        CellErrorType::Name => "#NAME!",
        CellErrorType::Null => "#NULL!",
        CellErrorType::Num => "#NUM!",
        CellErrorType::Ref => "#REF!",
        CellErrorType::Value => "#VALUE!",
        CellErrorType::GettingData => "#GETTING!",
    }
}

fn special_value_to_str(value: f64) -> Option<&'static str> {
    if value.is_nan() {
        return Some("NaN!");
    }
    if value.is_infinite() {
        return Some(if value.is_sign_negative() { "-Inf!" } else { "Inf!" });
    }
    None
}
