use std::cmp::Ordering;

use serde_json::{
    Map,
    Value,
};

use crate::domain::input::table::ParsedDataTable;

pub(crate) fn normalize_options_object(options: Option<Value>) -> Map<String, Value> {
    match options {
        Some(Value::Object(map)) => map,
        _ => Map::new(),
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

pub(crate) fn sort_table_rows_by_factor_group(table: &mut ParsedDataTable) {
    table.rows.sort_by(|left, right| compare_factor_rows(left, right));
}

fn compare_factor_rows(left: &[Value],
                       right: &[Value])
                       -> Ordering {
    let left_profile = factor_profile(left);
    let right_profile = factor_profile(right);

    match (left_profile.dominant_factor, right_profile.dominant_factor) {
        (Some(left_factor), Some(right_factor)) => {
            let by_group = left_factor.cmp(&right_factor);
            if by_group != Ordering::Equal {
                return by_group;
            }
        },
        (Some(_), None) => return Ordering::Less,
        (None, Some(_)) => return Ordering::Greater,
        (None, None) => {},
    }

    let by_dominant_abs = right_profile.dominant_abs
                                       .partial_cmp(&left_profile.dominant_abs)
                                       .unwrap_or(Ordering::Equal);
    if by_dominant_abs != Ordering::Equal {
        return by_dominant_abs;
    }

    let by_max_abs = right_profile.max_abs
                                  .partial_cmp(&left_profile.max_abs)
                                  .unwrap_or(Ordering::Equal);
    if by_max_abs != Ordering::Equal {
        return by_max_abs;
    }

    first_cell_text(left).cmp(&first_cell_text(right))
}

#[derive(Debug, Clone, Copy)]
struct FactorProfile {
    dominant_factor: Option<usize>,
    dominant_abs: f64,
    max_abs: f64,
}

fn factor_profile(row: &[Value]) -> FactorProfile {
    let mut dominant_factor: Option<usize> = None;
    let mut dominant_abs = 0.0_f64;
    let mut max_abs = 0.0_f64;

    for (column_index, value) in row.iter().skip(1).enumerate() {
        let Some(number) = option_f64_from_value(value) else {
            continue;
        };
        let abs = number.abs();
        if abs > max_abs {
            max_abs = abs;
        }

        let should_replace = match dominant_factor {
            None => true,
            Some(current_index) => match abs.partial_cmp(&dominant_abs).unwrap_or(Ordering::Less) {
                Ordering::Greater => true,
                Ordering::Equal => column_index < current_index,
                Ordering::Less => false,
            },
        };

        if should_replace {
            dominant_factor = Some(column_index);
            dominant_abs = abs;
        }
    }

    FactorProfile { dominant_factor,
                    dominant_abs,
                    max_abs }
}

fn option_f64_from_value(value: &Value) -> Option<f64> {
    match value {
        Value::Number(number) => number.as_f64(),
        Value::String(text) => text.trim().parse::<f64>().ok(),
        _ => None,
    }
}

fn first_cell_text(row: &[Value]) -> String {
    let Some(value) = row.first() else {
        return String::new();
    };
    match value {
        Value::String(text) => text.clone(),
        Value::Number(number) => number.to_string(),
        Value::Bool(flag) => flag.to_string(),
        Value::Null => String::new(),
        _ => value.to_string(),
    }
}
