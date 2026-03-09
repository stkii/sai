use std::cmp::Ordering;

use serde_json::{
    Map,
    Value,
};

use crate::domain::input::table::ParsedDataTable;

pub(crate) fn normalize_options_object(options: Option<Value>) -> Map<String, Value> {
    match options {
        Some(Value::Object(map)) => map,
        Some(value) => {
            let mut map = Map::new();
            map.insert("value".to_string(), value);
            map
        },
        None => Map::new(),
    }
}

pub(crate) fn option_string_from_value(value: Option<&Value>) -> Option<String> {
    let value = value?;
    match value {
        Value::String(value) => {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        },
        Value::Number(value) => Some(value.to_string()),
        _ => None,
    }
}

pub(crate) fn option_bool_from_value(value: &Value) -> Option<bool> {
    match value {
        Value::Bool(value) => Some(*value),
        Value::Number(value) => value.as_i64().map(|n| n != 0),
        Value::String(value) => {
            let value = value.trim().to_ascii_lowercase();
            match value.as_str() {
                "true" | "1" | "yes" => Some(true),
                "false" | "0" | "no" => Some(false),
                _ => None,
            }
        },
        _ => None,
    }
}

pub(crate) fn sort_table_rows_by_abs_max(table: &mut ParsedDataTable) {
    table.rows.sort_by(|left, right| {
                  let left_score = row_abs_max(left);
                  let right_score = row_abs_max(right);
                  right_score.partial_cmp(&left_score).unwrap_or(Ordering::Equal)
              });
}

fn row_abs_max(row: &[Value]) -> f64 {
    row.iter()
       .filter_map(Value::as_f64)
       .map(f64::abs)
       .fold(0.0, f64::max)
}
