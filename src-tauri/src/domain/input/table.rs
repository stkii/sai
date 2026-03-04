use serde::{
    Deserialize,
    Serialize,
};
use serde_json::Value;
use std::collections::HashSet;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub(crate) struct ParsedDataTable {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<Value>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}

impl ParsedDataTable {
    pub(crate) fn validate(&self) -> Result<(), String> {
        let width = self.headers.len();
        for (row_index, row) in self.rows.iter().enumerate() {
            if row.len() != width {
                return Err(format!("ParsedDataTable validation error: row {} length {} != headers {}",
                                   row_index,
                                   row.len(),
                                   width));
            }
            for (col_index, cell) in row.iter().enumerate() {
                match cell {
                    Value::Null | Value::Bool(_) | Value::Number(_) | Value::String(_) => {},
                    _ => {
                        return Err(format!("ParsedDataTable validation error: rows[{}][{}] has unsupported type",
                                           row_index, col_index));
                    },
                }
            }
        }
        Ok(())
    }
}

#[derive(Clone, Debug)]
pub(crate) struct NormalizedRows {
    pub rows: Vec<Vec<Value>>,
    pub note: Option<String>,
}

pub(crate) fn collect_ordered_selected_columns(headers: &[String],
                                               variables: &[String])
                                               -> Result<Vec<(String, usize)>, String> {
    let header_set: HashSet<&str> = headers.iter().map(|header| header.as_str()).collect();
    let missing: Vec<&str> = variables.iter()
                                      .map(|variable| variable.as_str())
                                      .filter(|variable| !header_set.contains(*variable))
                                      .collect();
    if !missing.is_empty() {
        return Err(format!("Selected variables not found: {}", missing.join(", ")));
    }

    let selected_set: HashSet<&str> = variables.iter().map(|variable| variable.as_str()).collect();
    let mut selected = Vec::new();
    for (index, header) in headers.iter().enumerate() {
        if selected_set.contains(header.as_str()) {
            selected.push((header.clone(), index));
        }
    }

    if selected.is_empty() {
        return Err("No matching variables found".to_string());
    }

    Ok(selected)
}

pub(crate) fn normalize_rows(rows: Vec<Vec<Value>>,
                             header_len: usize)
                             -> NormalizedRows {
    if header_len == 0 {
        return NormalizedRows { rows, note: None };
    }

    let mut normalized = Vec::with_capacity(rows.len());
    let mut truncated_any = false;

    for mut row in rows {
        if row.len() > header_len {
            truncated_any = true;
            row.truncate(header_len);
        } else if row.len() < header_len {
            row.resize(header_len, Value::Null);
        }
        normalized.push(row);
    }

    let note = if truncated_any {
        Some("一部の行で列数がヘッダ行より多かったため、余分な列のみ切り捨てました".to_string())
    } else {
        None
    };

    NormalizedRows { rows: normalized,
                     note }
}

pub(crate) fn validate_unique_headers(headers: &[String]) -> Result<(), String> {
    let mut seen: HashSet<&str> = HashSet::new();
    let mut duplicate_seen: HashSet<&str> = HashSet::new();
    let mut duplicates: Vec<String> = Vec::new();

    for header in headers {
        let key = header.as_str();
        if !seen.insert(key) && duplicate_seen.insert(key) {
            duplicates.push(header.clone());
        }
    }

    if !duplicates.is_empty() {
        return Err(format!("Sheet headers are duplicated: {}", duplicates.join(", ")));
    }

    Ok(())
}
