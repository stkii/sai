use ::csv::{
    ReaderBuilder,
    StringRecord,
};
use indexmap::IndexMap;

use crate::dto::ParsedDataTable;
use crate::table;

pub fn parse_csv_table(path: &str) -> Result<ParsedDataTable, String> {
    let mut reader = ReaderBuilder::new().has_headers(true)
                                         .flexible(true)
                                         .from_path(path)
                                         .map_err(|e| format!("Failed to open CSV file: {}", e))?;

    let headers_record = reader.headers()
                               .map_err(|e| format!("Failed to read CSV headers: {}", e))?
                               .clone();

    if headers_record.is_empty() {
        return Ok(ParsedDataTable { headers: vec![],
                                    rows: vec![],
                                    note: None,
                                    title: None });
    }

    let headers = compute_headers_from_record(&headers_record)?;
    let rows = reader.records()
                     .map(|record| {
                         record.map(|r| {
                                   r.iter()
                                    .map(csv_cell_to_json_value)
                                    .collect::<Vec<serde_json::Value>>()
                               })
                               .map_err(|e| format!("Failed to read CSV row: {}", e))
                     })
                     .collect::<Result<Vec<_>, String>>()?;

    let normalized = table::normalize_rows(rows, headers.len());

    Ok(ParsedDataTable { headers,
                         rows: normalized.rows,
                         note: normalized.note,
                         title: None })
}

pub fn build_numeric_dataset_from_csv(path: &str,
                                      variables: &[String])
                                      -> Result<IndexMap<String, Vec<Option<f64>>>, String> {
    if variables.is_empty() {
        return Err("No variables selected".to_string());
    }

    let mut reader = ReaderBuilder::new().has_headers(true)
                                         .flexible(true)
                                         .from_path(path)
                                         .map_err(|e| format!("Failed to open CSV file: {}", e))?;

    let headers_record = reader.headers()
                               .map_err(|e| format!("Failed to read CSV headers: {}", e))?
                               .clone();

    if headers_record.is_empty() {
        return Err("CSV is empty".to_string());
    }

    let headers = compute_headers_from_record(&headers_record)?;
    let selected_columns = table::collect_ordered_selected_columns(&headers, variables)?;

    let mut dataset = IndexMap::with_capacity(selected_columns.len());
    for (header, _) in selected_columns.iter() {
        dataset.insert(header.clone(), Vec::new());
    }

    for (row_index, record) in reader.records().enumerate() {
        let record = record.map_err(|e| format!("Failed to read CSV row: {}", e))?;
        for (header, col_index) in selected_columns.iter() {
            let cell = record.get(*col_index);
            let value = parse_numeric_cell(cell, row_index, *col_index, header)?;
            dataset.get_mut(header)
                   .expect("dataset column exists")
                   .push(value);
        }
    }

    Ok(dataset)
}

fn compute_headers_from_record(record: &StringRecord) -> Result<Vec<String>, String> {
    let headers: Vec<String> = record.iter()
                                     .enumerate()
                                     .map(|(i, cell)| csv_cell_to_header_name(cell, i))
                                     .collect();

    table::validate_unique_headers(&headers)?;

    Ok(headers)
}

fn csv_cell_to_header_name(cell: &str,
                           col_index: usize)
                           -> String {
    let trimmed = cell.trim();
    if trimmed.is_empty() {
        format!("COLUMN_{}", col_index + 1)
    } else {
        trimmed.to_string()
    }
}

fn csv_cell_to_json_value(cell: &str) -> serde_json::Value {
    let trimmed = cell.trim();
    if trimmed.is_empty() {
        serde_json::Value::Null
    } else {
        serde_json::Value::String(cell.to_string())
    }
}

fn parse_numeric_cell(cell: Option<&str>,
                      row_index: usize,
                      col_index: usize,
                      header: &str)
                      -> Result<Option<f64>, String> {
    let row_no = row_index + 2;
    let col_no = col_index + 1;
    let to_err = |reason: &str| numeric_cell_error(row_no, col_no, header, reason);

    let Some(raw) = cell else {
        return Ok(None);
    };
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    match trimmed.parse::<f64>() {
        Ok(value) => {
            if value.is_finite() {
                Ok(Some(value))
            } else {
                Err(to_err("value is not finite"))
            }
        },
        Err(_) => Err(to_err("value is not numeric")),
    }
}

fn numeric_cell_error(row_no: usize,
                      col_no: usize,
                      header: &str,
                      reason: &str)
                      -> String {
    format!("Numeric dataset validation error at row {} col {} ({}): {}",
            row_no, col_no, header, reason)
}
