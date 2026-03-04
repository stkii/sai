use std::fs;
use std::ops::ControlFlow;
use std::path::{
    Path,
    PathBuf,
};

use chrono::NaiveDate;
use serde::de::DeserializeOwned;
use serde_json::Value;
use tauri::Manager;

use crate::dto::AnalysisResult;

const MAX_LOG_BYTES: u64 = 5 * 1024 * 1024;
const MAX_ROTATIONS: usize = 100;

#[derive(serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisLogEntry {
    pub analysis_id: String,
    pub timestamp: String,
    pub analysis_type: String,
    pub file_path: String,
    pub sheet_name: String,
    pub variables: Vec<String>,
    pub options: Value,
    // Stored for replaying the finalized output WITHOUT re-running analysis.
    // Raw per-subject values are NEVER stored here.
    pub result: AnalysisResult,
}

#[derive(serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisLogSummary {
    pub analysis_id: String,
    pub timestamp: String,
    pub analysis_type: String,
    pub file_path: String,
    pub sheet_name: String,
    pub variables: Vec<String>,
}

pub fn write_analysis_log(app_handle: &tauri::AppHandle,
                          entry: AnalysisLogEntry)
                          -> Result<(), String> {
    let logs_dir = analysis_logs_dir(app_handle)?;
    let log_path = analysis_log_file(&logs_dir);
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

fn analysis_log_file(logs_dir: &Path) -> PathBuf {
    logs_dir.join("analysis-log.jsonl")
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

#[derive(Clone)]
struct LogFileInfo {
    rotation: usize,
    path: PathBuf,
}

pub fn list_recent_analysis_logs(app_handle: &tauri::AppHandle,
                                 limit: usize)
                                 -> Result<Vec<AnalysisLogSummary>, String> {
    if limit == 0 {
        return Ok(Vec::new());
    }
    let logs_dir = analysis_logs_dir(app_handle)?;
    let mut entries = Vec::new();
    visit_log_entries::<AnalysisLogSummary>(&logs_dir, "list_recent", |entry| {
        entries.push(entry);
        if entries.len() >= limit {
            ControlFlow::Break(())
        } else {
            ControlFlow::Continue(())
        }
    })?;
    Ok(entries)
}

pub fn list_analysis_logs_by_period(app_handle: &tauri::AppHandle,
                                    from: Option<&str>,
                                    to: Option<&str>,
                                    limit: usize)
                                    -> Result<Vec<AnalysisLogSummary>, String> {
    if limit == 0 {
        return Ok(Vec::new());
    }
    let logs_dir = analysis_logs_dir(app_handle)?;
    let from = normalize_period_date(from)?;
    let to = normalize_period_date(to)?;
    if let (Some(from), Some(to)) = (from.as_ref(), to.as_ref())
       && from > to
    {
        return Err("開始日は終了日より前の日付を指定してください".to_string());
    }
    let mut entries = Vec::new();
    visit_log_entries::<AnalysisLogSummary>(&logs_dir, "list_by_period", |entry| {
        let entry_date = match extract_date_prefix(&entry.timestamp) {
            Some(date) => date,
            None => {
                log::warn!("analysis.list_by_period invalid_timestamp ts={}", entry.timestamp);
                return ControlFlow::Continue(());
            },
        };
        if let Some(from) = from.as_ref()
           && entry_date < *from
        {
            return ControlFlow::Continue(());
        }
        if let Some(to) = to.as_ref()
           && entry_date > *to
        {
            return ControlFlow::Continue(());
        }
        entries.push(entry);
        if entries.len() >= limit {
            ControlFlow::Break(())
        } else {
            ControlFlow::Continue(())
        }
    })?;
    Ok(entries)
}

pub fn get_analysis_log_entry(app_handle: &tauri::AppHandle,
                              analysis_id: &str)
                              -> Result<Option<AnalysisLogEntry>, String> {
    let logs_dir = analysis_logs_dir(app_handle)?;
    let mut found = None;
    visit_log_entries::<AnalysisLogEntry>(&logs_dir, "get_entry", |entry| {
        if entry.analysis_id == analysis_id {
            found = Some(entry);
            ControlFlow::Break(())
        } else {
            ControlFlow::Continue(())
        }
    })?;
    Ok(found)
}

fn list_log_files(logs_dir: &Path) -> Result<Vec<LogFileInfo>, String> {
    let mut files = Vec::new();
    let entries = fs::read_dir(logs_dir).map_err(|e| format!("Failed to read log directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read log entry: {}", e))?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let file_name = entry.file_name();
        let file_name = file_name.to_string_lossy();
        if let Some(rotation) = parse_log_file_name(&file_name) {
            files.push(LogFileInfo { rotation, path });
        }
    }

    files.sort_by_key(|info| info.rotation);
    Ok(files)
}

fn parse_log_file_name(name: &str) -> Option<usize> {
    const BASE: &str = "analysis-log.jsonl";
    if name == BASE {
        return Some(0);
    }
    let suffix = name.strip_prefix("analysis-log.jsonl.")?;
    let rotation = suffix.parse::<usize>().ok()?;
    if rotation == 0 {
        return None;
    }
    Some(rotation)
}

fn normalize_period_date(input: Option<&str>) -> Result<Option<NaiveDate>, String> {
    let Some(value) = input else { return Ok(None) };
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    NaiveDate::parse_from_str(trimmed, "%Y-%m-%d").map(Some)
                                                  .map_err(|_| {
                                                      "日付の形式が不正です (YYYY-MM-DD)".to_string()
                                                  })
}

fn extract_date_prefix(timestamp: &str) -> Option<NaiveDate> {
    let prefix = timestamp.get(0..10)?;
    NaiveDate::parse_from_str(prefix, "%Y-%m-%d").ok()
}

fn visit_log_entries<T>(logs_dir: &Path,
                        context: &str,
                        mut visit: impl FnMut(T) -> ControlFlow<()>)
                        -> Result<(), String>
    where T: DeserializeOwned
{
    let files = list_log_files(logs_dir)?;
    for info in files {
        let content = match fs::read_to_string(&info.path) {
            Ok(content) => content,
            Err(err) => {
                log::warn!("analysis.{} read_failed path={} err={}",
                           context,
                           info.path.to_string_lossy(),
                           err);
                continue;
            },
        };
        for line in content.lines().rev() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            match serde_json::from_str::<T>(line) {
                Ok(entry) => {
                    if visit(entry).is_break() {
                        return Ok(());
                    }
                },
                Err(err) => {
                    log::warn!("analysis.{} parse_failed err={}", context, err);
                },
            }
        }
    }
    Ok(())
}
