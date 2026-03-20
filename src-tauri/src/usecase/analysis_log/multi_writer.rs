use crate::domain::analysis_log::model::AnalysisLogRecord;

use super::ports::AnalysisLogWriter;

#[derive(Clone)]
pub(crate) struct MultiAnalysisLogWriter<P: AnalysisLogWriter, S: AnalysisLogWriter> {
    persistent: P,
    session: S,
}

impl<P: AnalysisLogWriter, S: AnalysisLogWriter> MultiAnalysisLogWriter<P, S> {
    pub(crate) fn new(persistent: P,
                      session: S)
                      -> Self {
        Self { persistent, session }
    }
}

impl<P: AnalysisLogWriter, S: AnalysisLogWriter> AnalysisLogWriter for MultiAnalysisLogWriter<P, S> {
    fn append(&self,
              record: &AnalysisLogRecord)
              -> Result<(), String> {
        self.persistent.append(record)?;
        self.session.append(record)
    }
}

#[cfg(test)]
mod tests {
    use std::sync::{
        Arc,
        Mutex,
    };

    use serde_json::json;

    use crate::domain::analysis::model::AnalysisResult;
    use crate::domain::analysis_log::model::{
        ANALYSIS_LOG_SCHEMA_VERSION,
        AnalysisDatasetRef,
        AnalysisLogRecord,
    };
    use crate::domain::input::table::ParsedDataTable;

    use super::MultiAnalysisLogWriter;
    use crate::usecase::analysis_log::ports::AnalysisLogWriter;

    #[derive(Clone, Default)]
    struct RecordingWriter {
        records: Arc<Mutex<Vec<String>>>,
    }

    impl AnalysisLogWriter for RecordingWriter {
        fn append(&self,
                  record: &AnalysisLogRecord)
                  -> Result<(), String> {
            let mut records = self.records
                                  .lock()
                                  .map_err(|_| "failed to lock recording writer".to_string())?;
            records.push(record.id.clone());
            Ok(())
        }
    }

    fn sample_record(id: &str) -> AnalysisLogRecord {
        AnalysisLogRecord { schema_version: ANALYSIS_LOG_SCHEMA_VERSION,
                            id: id.to_string(),
                            timestamp: "2026-03-14 10:00:00".to_string(),
                            analysis_type: "descriptive".to_string(),
                            dataset: AnalysisDatasetRef { path: "/tmp/data.csv".to_string(),
                                                          sheet: None },
                            variables: vec!["x".to_string()],
                            options: json!({ "order": "default" }),
                            result: AnalysisResult::Table { table:
                                                                ParsedDataTable { headers:
                                                                                      vec!["name".to_string()],
                                                                                  rows:
                                                                                      vec![vec!["x".into()]],
                                                                                  note: None,
                                                                                  title: None } },
                            n: None,
                            n_note: None }
    }

    #[test]
    fn append_writes_to_both_destinations() {
        let persistent = RecordingWriter::default();
        let session = RecordingWriter::default();
        let writer = MultiAnalysisLogWriter::new(persistent.clone(), session.clone());

        writer.append(&sample_record("run-1")).expect("append succeeds");

        let persistent_records = persistent.records.lock().expect("persistent records lock");
        let session_records = session.records.lock().expect("session records lock");
        assert_eq!(persistent_records.as_slice(), ["run-1"]);
        assert_eq!(session_records.as_slice(), ["run-1"]);
    }
}
