/// Common table helpers shared by CSV/Excel loaders.
use serde_json::Value;
use std::collections::HashSet;
use std::path::Path;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum DataSourceKind {
    Csv,
    Xlsx,
}

impl DataSourceKind {
    pub fn from_path(path: &str) -> Result<Self, String> {
        let ext = Path::new(path).extension()
                                 .and_then(|value| value.to_str())
                                 .map(|value| value.to_ascii_lowercase());
        match ext.as_deref() {
            Some("csv") => Ok(DataSourceKind::Csv),
            Some("xlsx") | Some("xls") => Ok(DataSourceKind::Xlsx),
            Some(other) => Err(format!("Unsupported file type: .{}", other)),
            None => Err("Unsupported file type: missing extension".to_string()),
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            DataSourceKind::Csv => "csv",
            DataSourceKind::Xlsx => "xlsx",
        }
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

pub(crate) fn normalize_rows(rows: Vec<Vec<Value>>,
                             header_len: usize)
                             -> NormalizedRows {
    if header_len == 0 {
        return NormalizedRows { rows, note: None };
    }

    let mut normalized = Vec::with_capacity(rows.len());
    let mut truncated_any = false;

    for mut row in rows.into_iter() {
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

/// This function is the single source of truth for header naming rules.
pub(crate) fn validate_unique_headers(headers: &[String]) -> Result<(), String> {
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
