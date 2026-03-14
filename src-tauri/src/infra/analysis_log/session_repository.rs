use std::collections::HashSet;
use std::sync::{
    Arc,
    Mutex,
};

use crate::domain::analysis_log::model::{
    AnalysisLogRecord,
    AnalysisLogSummary,
};
use crate::usecase::analysis_log::ports::{
    AnalysisLogWriter,
    SessionAnalysisLogReader,
};

#[derive(Debug, Default)]
struct SessionState {
    known_ids: HashSet<String>,
    summaries: Vec<AnalysisLogSummary>,
}

#[derive(Debug, Default)]
struct Shared {
    state: Mutex<SessionState>,
}

#[derive(Clone, Debug, Default)]
pub(crate) struct SessionAnalysisLogRepository {
    shared: Arc<Shared>,
}

impl AnalysisLogWriter for SessionAnalysisLogRepository {
    fn append(&self,
              record: &AnalysisLogRecord)
              -> Result<(), String> {
        let mut state = self.shared
                            .state
                            .lock()
                            .map_err(|_| "failed to lock session analysis log repository".to_string())?;
        if !state.known_ids.insert(record.id.clone()) {
            return Ok(());
        }
        state.summaries.push(record.summary());
        Ok(())
    }
}

impl SessionAnalysisLogReader for SessionAnalysisLogRepository {
    fn list(&self,
            limit: Option<usize>)
            -> Result<Vec<AnalysisLogSummary>, String> {
        let state = self.shared
                        .state
                        .lock()
                        .map_err(|_| "failed to lock session analysis log repository".to_string())?;

        let mut summaries = Vec::new();
        for summary in state.summaries.iter().rev() {
            summaries.push(summary.clone());
            if let Some(limit) = limit
               && summaries.len() >= limit
            {
                break;
            }
        }

        Ok(summaries)
    }

    fn contains(&self,
                id: &str)
                -> Result<bool, String> {
        let state = self.shared
                        .state
                        .lock()
                        .map_err(|_| "failed to lock session analysis log repository".to_string())?;
        Ok(state.known_ids.contains(id))
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use crate::domain::analysis::model::AnalysisResult;
    use crate::domain::analysis_log::model::{
        ANALYSIS_LOG_SCHEMA_VERSION,
        AnalysisDatasetRef,
        AnalysisLogRecord,
    };
    use crate::domain::input::table::ParsedDataTable;
    use crate::usecase::analysis_log::ports::{
        AnalysisLogWriter,
        SessionAnalysisLogReader,
    };

    use super::SessionAnalysisLogRepository;

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
                            options: json!({ "order": "default" }),
                            result: AnalysisResult::Table { table:
                                                                ParsedDataTable { headers:
                                                                                      vec!["name".to_string()],
                                                                                  rows:
                                                                                      vec![vec!["x".into()]],
                                                                                  note: None,
                                                                                  title: None } } }
    }

    #[test]
    fn list_and_contains_follow_session_order() {
        let repository = SessionAnalysisLogRepository::default();

        repository.append(&sample_record("1", "2026-03-14 10:00:00"))
                  .expect("append record 1");
        repository.append(&sample_record("2", "2026-03-14 10:05:00"))
                  .expect("append record 2");

        let summaries = repository.list(None).expect("list summaries");
        assert_eq!(summaries.len(), 2);
        assert_eq!(summaries[0].id, "2");
        assert_eq!(summaries[1].id, "1");

        let limited = repository.list(Some(1)).expect("list summaries with limit");
        assert_eq!(limited.len(), 1);
        assert_eq!(limited[0].id, "2");

        assert!(repository.contains("1").expect("contains existing record"));
        assert!(!repository.contains("missing").expect("contains missing record"));
    }
}
