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

        let mut max_factor_index = 0;
        let mut best_val = -1.0;
        let mut has_over_threshold = false;
        for (idx, val) in abs_values.iter().enumerate() {
            if *val >= LOADING_THRESHOLD {
                if !has_over_threshold || *val > best_val {
                    max_factor_index = idx;
                    best_val = *val;
                    has_over_threshold = true;
                }
            } else if !has_over_threshold && *val > best_val {
                max_factor_index = idx;
                best_val = *val;
            }
        }

        entries.push(RowEntry { original_index: index,
                                row,
                                abs_values,
                                max_factor_index });
    }

    let mut buckets: Vec<Vec<RowEntry>> = (0..factor_count).map(|_| Vec::new()).collect();
    for entry in entries {
        let factor_idx = entry.max_factor_index;
        buckets[factor_idx].push(entry);
    }

    let mut sorted_rows: Vec<Vec<Value>> = Vec::with_capacity(buckets.iter().map(|b| b.len()).sum());
    for (factor_idx, bucket) in buckets.iter_mut().enumerate() {
        bucket.sort_by(|a, b| compare_entries(a, b, factor_idx));
        sorted_rows.extend(bucket.drain(..).map(|entry| entry.row));
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
                   -> std::cmp::Ordering {
    let left = a.abs_values[factor_idx];
    let right = b.abs_values[factor_idx];
    right.partial_cmp(&left)
         .unwrap_or(std::cmp::Ordering::Equal)
         .then_with(|| a.original_index.cmp(&b.original_index))
}

struct RowEntry {
    original_index: usize,
    row: Vec<Value>,
    abs_values: Vec<f64>,
    max_factor_index: usize,
}
