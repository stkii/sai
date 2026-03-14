use std::fs::{
    self,
    File,
    OpenOptions,
};
use std::io::{
    BufRead,
    BufReader,
    Write,
};
use std::path::{
    Path,
    PathBuf,
};
use std::sync::{
    Arc,
    Mutex,
};

use crate::domain::analysis_log::model::{
    AnalysisLogRecord,
    AnalysisLogSummary,
};
use crate::usecase::analysis_log::ports::{
    AnalysisLogReader,
    AnalysisLogWriter,
};

const LOG_FILE_PREFIX: &str = "analysis-log-";
const LOG_FILE_SUFFIX: &str = ".jsonl";

#[derive(Debug)]
struct Shared {
    base_dir: PathBuf,
    max_file_size_bytes: u64,
    io_lock: Mutex<()>,
}

#[derive(Clone, Debug)]
pub(crate) struct JsonlAnalysisLogRepository {
    shared: Arc<Shared>,
}

impl JsonlAnalysisLogRepository {
    pub(crate) fn new(base_dir: PathBuf,
                      max_file_size_bytes: u64)
                      -> Self {
        Self { shared: Arc::new(Shared { base_dir,
                                         max_file_size_bytes,
                                         io_lock: Mutex::new(()) }) }
    }

    fn ensure_dir_exists(&self) -> Result<(), String> {
        fs::create_dir_all(&self.shared.base_dir).map_err(|e| {
            format!("failed to create analysis log directory '{}': {}",
                    self.shared.base_dir.display(),
                    e)
        })
    }

    fn list_log_files(&self) -> Result<Vec<(u32, PathBuf)>, String> {
        if !self.shared.base_dir.exists() {
            return Ok(Vec::new());
        }

        let mut files = Vec::new();
        for entry in fs::read_dir(&self.shared.base_dir).map_err(|e| {
                         format!("failed to read analysis log directory '{}': {}",
                                 self.shared.base_dir.display(),
                                 e)
                     })?
        {
            let entry = entry.map_err(|e| format!("failed to read analysis log directory entry: {}", e))?;
            let path = entry.path();
            let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
                continue;
            };
            if let Some(sequence) = parse_log_sequence(name) {
                files.push((sequence, path));
            }
        }

        files.sort_by_key(|(sequence, _)| *sequence);
        Ok(files)
    }

    fn resolve_append_path(&self,
                           next_line_size: u64)
                           -> Result<PathBuf, String> {
        let files = self.list_log_files()?;
        let Some((sequence, path)) = files.last() else {
            return Ok(self.shared.base_dir.join(log_file_name(1)));
        };

        let current_size = file_size(path)?;
        if current_size > 0 && current_size.saturating_add(next_line_size) > self.shared.max_file_size_bytes {
            return Ok(self.shared.base_dir.join(log_file_name(sequence + 1)));
        }

        if current_size >= self.shared.max_file_size_bytes {
            return Ok(self.shared.base_dir.join(log_file_name(sequence + 1)));
        }

        Ok(path.clone())
    }

    fn read_records_from_file(path: &Path) -> Result<Vec<AnalysisLogRecord>, String> {
        let file = File::open(path).map_err(|e| {
                                       format!("failed to open analysis log file '{}': {}", path.display(), e)
                                   })?;
        let reader = BufReader::new(file);

        let mut records = Vec::new();
        for (line_index, line) in reader.lines().enumerate() {
            let line = line.map_err(|e| {
                               format!("failed to read analysis log file '{}' line {}: {}",
                                       path.display(),
                                       line_index + 1,
                                       e)
                           })?;
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            let record = serde_json::from_str::<AnalysisLogRecord>(trimmed).map_err(|e| {
                             format!("failed to parse analysis log file '{}' line {}: {}",
                                     path.display(),
                                     line_index + 1,
                                     e)
                         })?;
            records.push(record);
        }

        Ok(records)
    }
}

impl AnalysisLogWriter for JsonlAnalysisLogRepository {
    fn append(&self,
              record: &AnalysisLogRecord)
              -> Result<(), String> {
        let _guard = self.shared
                         .io_lock
                         .lock()
                         .map_err(|_| "failed to lock analysis log repository".to_string())?;
        self.ensure_dir_exists()?;

        let serialized = serde_json::to_string(record).map_err(|e| {
                             format!("failed to serialize analysis log record '{}': {}", record.id, e)
                         })?;
        let line = format!("{}\n", serialized);
        let path = self.resolve_append_path(line.len() as u64)?;

        let mut file =
            OpenOptions::new().create(true)
                              .append(true)
                              .open(&path)
                              .map_err(|e| {
                                  format!("failed to open analysis log file '{}': {}", path.display(), e)
                              })?;
        file.write_all(line.as_bytes()).map_err(|e| {
                                           format!("failed to append analysis log file '{}': {}",
                                                   path.display(),
                                                   e)
                                       })
    }
}

impl AnalysisLogReader for JsonlAnalysisLogRepository {
    fn list(&self,
            limit: Option<usize>)
            -> Result<Vec<AnalysisLogSummary>, String> {
        let _guard = self.shared
                         .io_lock
                         .lock()
                         .map_err(|_| "failed to lock analysis log repository".to_string())?;
        let files = self.list_log_files()?;
        let mut summaries = Vec::new();

        for (_, path) in files.into_iter().rev() {
            let records = Self::read_records_from_file(&path)?;
            for record in records.into_iter().rev() {
                summaries.push(record.summary());
                if let Some(limit) = limit
                   && summaries.len() >= limit
                {
                    return Ok(summaries);
                }
            }
        }

        Ok(summaries)
    }

    fn get(&self,
           id: &str)
           -> Result<Option<AnalysisLogRecord>, String> {
        let _guard = self.shared
                         .io_lock
                         .lock()
                         .map_err(|_| "failed to lock analysis log repository".to_string())?;
        let files = self.list_log_files()?;

        for (_, path) in files.into_iter().rev() {
            let records = Self::read_records_from_file(&path)?;
            for record in records.into_iter().rev() {
                if record.id == id {
                    return Ok(Some(record));
                }
            }
        }

        Ok(None)
    }
}

fn parse_log_sequence(file_name: &str) -> Option<u32> {
    let suffix_stripped = file_name.strip_suffix(LOG_FILE_SUFFIX)?;
    let sequence_str = suffix_stripped.strip_prefix(LOG_FILE_PREFIX)?;
    sequence_str.parse::<u32>().ok()
}

fn log_file_name(sequence: u32) -> String {
    format!("{}{:06}{}", LOG_FILE_PREFIX, sequence, LOG_FILE_SUFFIX)
}

fn file_size(path: &Path) -> Result<u64, String> {
    fs::metadata(path).map(|metadata| metadata.len()).map_err(|e| {
                                                 format!("failed to read analysis log metadata '{}': {}",
                                                         path.display(),
                                                         e)
                                             })
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use crate::domain::analysis::model::AnalysisResult;
    use crate::domain::analysis_log::model::{
        ANALYSIS_LOG_SCHEMA_VERSION,
        AnalysisDatasetRef,
        AnalysisLogRecord,
    };
    use crate::domain::input::table::ParsedDataTable;
    use crate::usecase::analysis_log::ports::{
        AnalysisLogReader,
        AnalysisLogWriter,
    };

    use super::JsonlAnalysisLogRepository;

    fn sample_record(id: &str,
                     timestamp: &str)
                     -> AnalysisLogRecord {
        AnalysisLogRecord { schema_version: ANALYSIS_LOG_SCHEMA_VERSION,
                            id: id.to_string(),
                            timestamp: timestamp.to_string(),
                            analysis_type: "descriptive".to_string(),
                            dataset: AnalysisDatasetRef { path: "/tmp/data.csv".to_string(),
                                                          sheet: None },
                            variables: vec!["x".to_string(), "y".to_string()],
                            options: serde_json::json!({ "order": "default" }),
                            result: AnalysisResult::Table { table:
                                                                ParsedDataTable { headers:
                                                                                      vec!["name".to_string()],
                                                                                  rows:
                                                                                      vec![vec!["x".into()]],
                                                                                  note: None,
                                                                                  title: None } } }
    }

    #[test]
    fn append_and_read_back_records() {
        let temp = tempdir().expect("tempdir");
        let repository = JsonlAnalysisLogRepository::new(temp.path().join("analysis-logs"), 5 * 1024 * 1024);

        repository.append(&sample_record("1", "2026-03-13 10:00:00"))
                  .expect("append record 1");
        repository.append(&sample_record("2", "2026-03-13 10:05:00"))
                  .expect("append record 2");

        let summaries = repository.list(None).expect("list summaries");
        assert_eq!(summaries.len(), 2);
        assert_eq!(summaries[0].id, "2");
        assert_eq!(summaries[1].id, "1");

        let record = repository.get("1").expect("get record").expect("record exists");
        assert_eq!(record.id, "1");
        assert_eq!(record.variables, vec!["x".to_string(), "y".to_string()]);
    }

    #[test]
    fn rotates_when_file_size_limit_is_reached() {
        let temp = tempdir().expect("tempdir");
        let repository = JsonlAnalysisLogRepository::new(temp.path().join("analysis-logs"), 300);

        repository.append(&sample_record("1", "2026-03-13 10:00:00"))
                  .expect("append record 1");
        repository.append(&sample_record("2", "2026-03-13 10:05:00"))
                  .expect("append record 2");

        let mut files = std::fs::read_dir(temp.path().join("analysis-logs")).expect("read dir")
                                                                            .map(|entry| {
                                                                                entry.expect("entry")
                                                                                     .file_name()
                                                                                     .to_string_lossy()
                                                                                     .into_owned()
                                                                            })
                                                                            .collect::<Vec<_>>();
        files.sort();

        assert_eq!(files.len(), 2);
        assert_eq!(files[0], "analysis-log-000001.jsonl");
        assert_eq!(files[1], "analysis-log-000002.jsonl");
    }
}
