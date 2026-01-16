use std::fs;
use std::path::{
    Path,
    PathBuf,
};

use chrono::Local;
use serde_json::Value;
use tauri::Manager;

use crate::dto::AnalysisResult;

const MAX_LOG_BYTES: u64 = 5 * 1024 * 1024;
const MAX_ROTATIONS: usize = 100;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisLogEntry {
    pub timestamp: String,
    pub analysis_type: String,
    pub dataset_id: String,
    pub file_path: String,
    pub sheet_name: String,
    pub variables: Vec<String>,
    pub options: Value,
    // Stored for replaying the finalized output WITHOUT re-running analysis.
    // Raw per-subject values are NEVER stored here.
    pub result: AnalysisResult,
}

pub fn write_analysis_log(app_handle: &tauri::AppHandle,
                          entry: AnalysisLogEntry)
                          -> Result<(), String> {
    let logs_dir = analysis_logs_dir(app_handle)?;
    let log_path = analysis_log_file_for_today(&logs_dir);
    let line = serde_json::to_string(&entry).map_err(|e| format!("Failed to serialize log: {}", e))?;
    rotate_log_if_needed(&log_path, line.len() as u64 + 1)?;

    let mut file = fs::OpenOptions::new().create(true)
                                         .append(true)
                                         .open(&log_path)
                                         .map_err(|e| format!("Failed to open log file: {}", e))?;
    use std::io::Write;
    file.write_all(line.as_bytes())
        .and_then(|_| file.write_all(b"\n"))
        .map_err(|e| format!("Failed to write log file: {}", e))?;
    file.flush()
        .map_err(|e| format!("Failed to flush log file: {}", e))?;
    Ok(())
}

fn current_log_date_stamp() -> String {
    Local::now().format("%Y%m%d").to_string()
}

fn analysis_log_file_for_today(logs_dir: &Path) -> PathBuf {
    let stamp = current_log_date_stamp();
    logs_dir.join(format!("analysis-log-{}.jsonl", stamp))
}

fn analysis_logs_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base_dir = app_handle.path()
                             .app_local_data_dir()
                             .map_err(|e| format!("Failed to resolve log directory: {}", e))?;
    let logs_dir = base_dir.join("analysis");
    fs::create_dir_all(&logs_dir).map_err(|e| format!("Failed to create log directory: {}", e))?;
    Ok(logs_dir)
}

fn rotate_log_if_needed(log_path: &Path,
                        incoming_bytes: u64)
                        -> Result<(), String> {
    let current_size = match fs::metadata(log_path) {
        Ok(metadata) => metadata.len(),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => 0,
        Err(e) => return Err(format!("Failed to stat log file: {}", e)),
    };

    if current_size + incoming_bytes <= MAX_LOG_BYTES {
        return Ok(());
    }

    for idx in (1..=MAX_ROTATIONS).rev() {
        let path = rotated_log_path(log_path, idx);
        if path.exists() {
            if idx == MAX_ROTATIONS {
                fs::remove_file(&path).map_err(|e| format!("Failed to remove log rotation {}: {}", idx, e))?;
            } else {
                let next = rotated_log_path(log_path, idx + 1);
                fs::rename(&path, &next).map_err(|e| {
                                            format!("Failed to rotate log {} -> {}: {}", idx, idx + 1, e)
                                        })?;
            }
        }
    }

    if log_path.exists() {
        let rotated = rotated_log_path(log_path, 1);
        fs::rename(log_path, rotated).map_err(|e| format!("Failed to rotate log file: {}", e))?;
    }

    Ok(())
}

fn rotated_log_path(log_path: &Path,
                    index: usize)
                    -> PathBuf {
    PathBuf::from(format!("{}.{}", log_path.to_string_lossy(), index))
}
