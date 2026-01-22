use std::cmp::Ordering;

use serde_json::Value;

use crate::dto::{
    AnalysisResult,
    ParsedDataTable,
};

const LOADING_THRESHOLD: f64 = 0.30;

pub fn sort_factor_loadings(result: &mut AnalysisResult) {
    if let AnalysisResult::Factor { factor } = result {
        sort_factor_table(&mut factor.pattern);
        if let Some(structure) = factor.structure.as_mut() {
            sort_factor_table(structure);
        }
    }
}

fn sort_factor_table(table: &mut ParsedDataTable) {
    if table.headers.len() <= 1 || table.rows.is_empty() {
        return;
    }

    let factor_count = table.headers.len() - 1;
    let rows = std::mem::take(&mut table.rows);
    let mut entries: Vec<RowEntry> = Vec::with_capacity(rows.len());

    for (index, row) in rows.into_iter().enumerate() {
        let mut abs_values = Vec::with_capacity(factor_count);
        for factor_idx in 0..factor_count {
            let abs = row.get(factor_idx + 1)
                         .and_then(parse_loading_value)
                         .map(|value| value.abs())
                         .unwrap_or(-1.0);
            abs_values.push(abs);
        }

        let (max_factor_index, _) = abs_values.iter().enumerate().fold((0, -1.0),
                                                                       |(best_idx, best_val), (idx, val)| {
                                                                           if *val > best_val {
                                                                               (idx, *val)
                                                                           } else {
                                                                               (best_idx, best_val)
                                                                           }
                                                                       });

        entries.push(RowEntry { original_index: index,
                                row,
                                abs_values,
                                max_factor_index });
    }

    let mut buckets: Vec<Vec<RowEntry>> = (0..factor_count).map(|_| Vec::new()).collect();
    for entry in entries {
        buckets[entry.max_factor_index].push(entry);
    }

    let mut sorted_rows: Vec<Vec<Value>> = Vec::with_capacity(buckets.iter().map(|b| b.len()).sum());
    for (factor_idx, bucket) in buckets.into_iter().enumerate() {
        let mut high = Vec::new();
        let mut low = Vec::new();
        for entry in bucket {
            if entry.abs_values[factor_idx] >= LOADING_THRESHOLD {
                high.push(entry);
            } else {
                low.push(entry);
            }
        }

        high.sort_by(|a, b| compare_entries(a, b, factor_idx));
        low.sort_by(|a, b| compare_entries(a, b, factor_idx));

        sorted_rows.extend(high.into_iter().map(|entry| entry.row));
        sorted_rows.extend(low.into_iter().map(|entry| entry.row));
    }

    table.rows = sorted_rows;
}

fn parse_loading_value(value: &Value) -> Option<f64> {
    match value {
        Value::Number(number) => number.as_f64().filter(|v| v.is_finite()),
        Value::String(text) => text.trim().parse::<f64>().ok().filter(|v| v.is_finite()),
        _ => None,
    }
}

fn compare_entries(a: &RowEntry,
                   b: &RowEntry,
                   factor_idx: usize)
                   -> Ordering {
    let left = a.abs_values[factor_idx];
    let right = b.abs_values[factor_idx];
    right.partial_cmp(&left)
         .unwrap_or(Ordering::Equal)
         .then_with(|| a.original_index.cmp(&b.original_index))
}

struct RowEntry {
    original_index: usize,
    row: Vec<Value>,
    abs_values: Vec<f64>,
    max_factor_index: usize,
}
