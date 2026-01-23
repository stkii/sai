/// Common table helpers shared by CSV/Excel loaders.
use serde_json::Value;
use std::collections::HashSet;

pub struct NormalizedRows {
    pub rows: Vec<Vec<Value>>,
    pub note: Option<String>,
}

pub fn normalize_rows(rows: Vec<Vec<Value>>,
                      header_len: usize)
                      -> NormalizedRows {
    if header_len == 0 {
        return NormalizedRows { rows, note: None };
    }

    let mut normalized = Vec::with_capacity(rows.len());
    let mut truncated_count = 0;
    let mut first_truncated_row = None;

    for (i, mut row) in rows.into_iter().enumerate() {
        if row.len() > header_len {
            truncated_count += 1;
            if first_truncated_row.is_none() {
                first_truncated_row = Some(i + 2);
            }
            row.truncate(header_len);
        } else if row.len() < header_len {
            row.resize(header_len, Value::Null);
        }
        normalized.push(row);
    }

    let note = first_truncated_row.map(|row_no| build_truncate_note(row_no, truncated_count));

    NormalizedRows { rows: normalized,
                     note }
}

fn build_truncate_note(row_no: usize,
                       count: usize)
                       -> String {
    format!("一部の行で列数がヘッダ行より多かったため、余分な列を切り捨てました。計 {} 行（ {} 行目）。",
            count, row_no)
}

pub fn collect_ordered_selected_columns(headers: &[String],
                                        variables: &[String])
                                        -> Result<Vec<(String, usize)>, String> {
    let header_set: HashSet<&str> = headers.iter().map(|h| h.as_str()).collect();
    let missing: Vec<&str> = variables.iter()
                                      .map(|v| v.as_str())
                                      .filter(|v| !header_set.contains(*v))
                                      .collect();
    if !missing.is_empty() {
        return Err(format!("Selected variables not found: {}", missing.join(", ")));
    }

    let selected_set: HashSet<&str> = variables.iter().map(|v| v.as_str()).collect();
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

/// This function is the single source of truth for header naming rules.
pub fn validate_unique_headers(headers: &[String]) -> Result<(), String> {
    let mut seen: HashSet<&str> = HashSet::new();
    let mut dup_seen: HashSet<&str> = HashSet::new();
    let mut dups: Vec<String> = Vec::new();
    for h in headers {
        let key = h.as_str();
        if !seen.insert(key) && dup_seen.insert(key) {
            dups.push(h.clone());
        }
    }
    if !dups.is_empty() {
        return Err(format!("Sheet headers are duplicated: {}", dups.join(", ")));
    }

    Ok(())
}
