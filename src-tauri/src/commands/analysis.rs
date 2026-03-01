use crate::analysis::types::AnalysisRunResult;
use crate::analysis::{
    log as analysis_log,
    options as analysis_options,
    runner,
    sort,
};
use crate::cache;
use crate::data::data_source;
use crate::data::types::DataSourceKind;
use chrono::Local;
use serde_json::Value;
use uuid::Uuid;

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

    let loaded =
        data_source::build_numeric_dataset(kind, &path, sheet.as_deref(), &variables).map_err(|e| {
            log::error!("analysis.build_numeric_dataset failed path={} kind={} sheet={} err={}",
                        path,
                        kind.as_str(),
                        sheet_label,
                        e);
            e
        })?;

    let row_count = loaded.dataset.values().next().map(|col| col.len()).unwrap_or(0);
    let dataset_len = loaded.dataset.len();
    let variables_in_order = loaded.dataset.keys().cloned().collect();
    let dataset_cache_id =
        cache::insert_numeric_dataset(cache::NumericDatasetEntry { dataset: loaded.dataset,
                                                                   path: path.clone(),
                                                                   sheet: loaded.sheet_name.clone(),
                                                                   variables: variables_in_order })?;

    log::info!("analysis.build_numeric_dataset ok path={} kind={} sheet={} dataset_cache_id={} vars={} rows={}",
               path,
               kind.as_str(),
               loaded.sheet_name,
               dataset_cache_id,
               dataset_len,
               row_count);

    Ok(dataset_cache_id)
}

#[tauri::command]
pub fn clear_numeric_dataset_cache() -> Result<(), String> {
    log::info!("analysis.clear_numeric_dataset_cache start");
    cache::clear_numeric_dataset_cache()?;
    log::info!("analysis.clear_numeric_dataset_cache ok");
    Ok(())
}

#[tauri::command]
pub fn run_analysis(app_handle: tauri::AppHandle,
                    dataset_cache_id: String,
                    analysis_type: String,
                    options: Option<Value>)
                    -> Result<AnalysisRunResult, String> {
    log::info!("analysis.run_analysis start dataset_cache_id={} type={}",
               dataset_cache_id,
               analysis_type);

    let entry =
        cache::get_numeric_dataset(&dataset_cache_id)?.ok_or_else(|| "Dataset not found".to_string())?;

    let normalized = analysis_options::normalize_analysis_options(&analysis_type, options);
    let options_for_r = normalized.options_for_r;
    let mut result = runner::run_r_analysis(&analysis_type, &entry.dataset, &options_for_r)?;
    if analysis_type == "factor" && normalized.sort_factor_loadings {
        sort::sort_factor_loadings(&mut result);
    }

    let logged_at = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let analysis_id = Uuid::new_v4().to_string();
    let log_entry = analysis_log::AnalysisLogEntry { analysis_id: analysis_id.clone(),
                                                     timestamp: logged_at.clone(),
                                                     analysis_type: analysis_type.clone(),
                                                     file_path: entry.path.clone(),
                                                     sheet_name: entry.sheet.clone(),
                                                     variables: entry.variables.clone(),
                                                     options: options_for_r,
                                                     result: result.clone() };
    analysis_log::write_analysis_log(&app_handle, log_entry)?;

    log::info!("analysis.run_analysis ok dataset_cache_id={} type={}",
               dataset_cache_id,
               analysis_type);

    Ok(AnalysisRunResult { result,
                           logged_at,
                           analysis_id })
}

#[tauri::command]
pub fn run_power_test(app_handle: tauri::AppHandle,
                      options: Option<Value>)
                      -> Result<AnalysisRunResult, String> {
    log::info!("analysis.run_power_test start");

    let options_for_r = analysis_options::normalize_analysis_options("power", options).options_for_r;
    let result = runner::run_r_power_test(&options_for_r)?;

    let logged_at = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let analysis_id = Uuid::new_v4().to_string();
    let log_entry = analysis_log::AnalysisLogEntry { analysis_id: analysis_id.clone(),
                                                     timestamp: logged_at.clone(),
                                                     analysis_type: "power".to_string(),
                                                     file_path: "-".to_string(),
                                                     sheet_name: "-".to_string(),
                                                     variables: vec![],
                                                     options: options_for_r,
                                                     result: result.clone() };
    analysis_log::write_analysis_log(&app_handle, log_entry)?;

    log::info!("analysis.run_power_test ok");

    Ok(AnalysisRunResult { result,
                           logged_at,
                           analysis_id })
}

#[tauri::command]
pub fn list_recent_analysis_logs(app_handle: tauri::AppHandle,
                                 limit: Option<usize>)
                                 -> Result<Vec<analysis_log::AnalysisLogSummary>, String> {
    let limit = limit.unwrap_or(20);
    analysis_log::list_recent_analysis_logs(&app_handle, limit)
}

#[tauri::command]
pub fn list_analysis_logs_by_period(app_handle: tauri::AppHandle,
                                    from: Option<String>,
                                    to: Option<String>,
                                    limit: Option<usize>)
                                    -> Result<Vec<analysis_log::AnalysisLogSummary>, String> {
    let limit = limit.unwrap_or(200);
    let from = from.as_deref();
    let to = to.as_deref();
    analysis_log::list_analysis_logs_by_period(&app_handle, from, to, limit)
}

#[tauri::command]
pub fn get_analysis_log_entry(app_handle: tauri::AppHandle,
                              analysis_id: String)
                              -> Result<analysis_log::AnalysisLogEntry, String> {
    analysis_log::get_analysis_log_entry(&app_handle, &analysis_id)?
        .ok_or_else(|| "分析ログが見つかりませんでした".to_string())
}
