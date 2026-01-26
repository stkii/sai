use crate::analysis::types::AnalysisRunResult;
use crate::analysis::{
    log as analysis_log,
    runner,
    sort,
};
use crate::types::DataSourceKind;
use crate::{
    cache,
    csv,
    excel,
};
use chrono::Local;
use serde_json::Value;

#[tauri::command]
pub fn build_numeric_dataset(path: String,
                             sheet: Option<String>,
                             variables: Vec<String>)
                             -> Result<String, String> {
    let kind = DataSourceKind::from_path(&path)?;
    let sheet_label = sheet.clone().unwrap_or_else(|| "-".to_string());
    log::info!("analysis.build_numeric_dataset start path={} kind={} sheet={} vars={}",
               path,
               kind.as_str(),
               sheet_label,
               variables.len());

    let (dataset, sheet_name) = match kind {
        DataSourceKind::Csv => {
            let dataset =
                csv::build_numeric_dataset_from_csv(&path, &variables).map_err(|e| {
                    log::error!("analysis.build_numeric_dataset build_failed path={} kind={} err={}",
                                path,
                                kind.as_str(),
                                e);
                    e
                })?;
            (dataset, "CSV".to_string())
        },
        DataSourceKind::Excel => {
            let sheet = sheet.ok_or_else(|| "Sheet is required for Excel file".to_string())?;
            let rows = excel::read_excel_sheet_rows(&path, &sheet).map_err(|e| {
                           log::error!("analysis.build_numeric_dataset read_failed path={} sheet={} err={}",
                                       path,
                                       sheet,
                                       e);
                           e
                       })?;
            let dataset =
                excel::build_numeric_dataset(rows, &variables).map_err(|e| {
                    log::error!("analysis.build_numeric_dataset build_failed path={} sheet={} err={}",
                                path,
                                sheet,
                                e);
                    e
                })?;
            (dataset, sheet)
        },
    };

    let row_count = dataset.values().next().map(|col| col.len()).unwrap_or(0);
    let dataset_len = dataset.len();
    let variables_in_order = dataset.keys().cloned().collect();
    let dataset_id =
        cache::insert_numeric_dataset(cache::NumericDatasetEntry { dataset,
                                                                   path: path.clone(),
                                                                   sheet: sheet_name.clone(),
                                                                   variables: variables_in_order })?;

    log::info!("analysis.build_numeric_dataset ok path={} kind={} sheet={} dataset_id={} vars={} rows={}",
               path,
               kind.as_str(),
               sheet_name,
               dataset_id,
               dataset_len,
               row_count);

    Ok(dataset_id)
}

#[tauri::command]
pub fn run_analysis(app_handle: tauri::AppHandle,
                    dataset_id: String,
                    analysis_type: String,
                    options: Option<Value>)
                    -> Result<AnalysisRunResult, String> {
    log::info!("analysis.run_analysis start dataset_id={} type={}",
               dataset_id,
               analysis_type);

    let entry = cache::get_numeric_dataset(&dataset_id)?.ok_or_else(|| "Dataset not found".to_string())?;

    let options_for_r = build_options_for_r(&analysis_type, options);
    let mut result = runner::run_r_analysis(&analysis_type, &entry.dataset, &options_for_r)?;
    if analysis_type == "factor" && should_sort_factor_loadings(&options_for_r) {
        sort::sort_factor_loadings(&mut result);
    }

    let logged_at = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let log_entry = analysis_log::AnalysisLogEntry { timestamp: logged_at.clone(),
                                                     analysis_type: analysis_type.clone(),
                                                     dataset_id: dataset_id.clone(),
                                                     file_path: entry.path.clone(),
                                                     sheet_name: entry.sheet.clone(),
                                                     variables: entry.variables.clone(),
                                                     options: options_for_r,
                                                     result: result.clone() };
    analysis_log::write_analysis_log(&app_handle, log_entry)?;

    log::info!("analysis.run_analysis ok dataset_id={} type={}",
               dataset_id,
               analysis_type);

    Ok(AnalysisRunResult { result, logged_at })
}

#[tauri::command]
pub fn run_power_test(app_handle: tauri::AppHandle,
                      options: Option<Value>)
                      -> Result<AnalysisRunResult, String> {
    log::info!("analysis.run_power_test start");

    let options_for_r = build_options_for_r("power", options);
    let result = runner::run_r_power_test(&options_for_r)?;

    let logged_at = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let log_entry = analysis_log::AnalysisLogEntry { timestamp: logged_at.clone(),
                                                     analysis_type: "power".to_string(),
                                                     dataset_id: "-".to_string(),
                                                     file_path: "-".to_string(),
                                                     sheet_name: "-".to_string(),
                                                     variables: vec![],
                                                     options: options_for_r,
                                                     result: result.clone() };
    analysis_log::write_analysis_log(&app_handle, log_entry)?;

    log::info!("analysis.run_power_test ok");

    Ok(AnalysisRunResult { result, logged_at })
}

fn build_options_for_r(analysis_type: &str,
                       options: Option<Value>)
                       -> Value {
    let mut map = match options {
        Some(Value::Object(map)) => map,
        Some(value) => {
            let mut map = serde_json::Map::new();
            map.insert("value".to_string(), value);
            map
        },
        None => serde_json::Map::new(),
    };

    if analysis_type == "descriptive" {
        let order_value = get_option_string(&map, "order").unwrap_or_else(|| "default".to_string());
        let na_ignore_value =
            get_option_bool(&map, "na_ignore").or_else(|| get_option_bool(&map, "naIgnore"))
                                              .unwrap_or(true);
        map.insert("order".to_string(), Value::String(order_value));
        map.insert("na_ignore".to_string(), Value::Bool(na_ignore_value));
    }

    Value::Object(map)
}

fn get_option_string(map: &serde_json::Map<String, Value>,
                     key: &str)
                     -> Option<String> {
    let value = map.get(key)?;
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

fn get_option_bool(map: &serde_json::Map<String, Value>,
                   key: &str)
                   -> Option<bool> {
    let value = map.get(key)?;
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

fn should_sort_factor_loadings(options: &Value) -> bool {
    get_option_bool_from_value(options, "sort_loadings").or_else(|| {
                                                            get_option_bool_from_value(options,
                                                                                       "sortLoadings")
                                                        })
                                                        .unwrap_or(false)
}

fn get_option_bool_from_value(options: &Value,
                              key: &str)
                              -> Option<bool> {
    let map = match options {
        Value::Object(map) => map,
        _ => return None,
    };
    let value = map.get(key)?;
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
