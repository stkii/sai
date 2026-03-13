use crate::domain::analysis_log::model::{
    AnalysisLogRecord,
    AnalysisLogSummary,
};

pub(crate) trait AnalysisLogStore: Send + Sync {
    fn append(&self,
              record: &AnalysisLogRecord)
              -> Result<(), String>;

    fn list(&self,
            limit: Option<usize>)
            -> Result<Vec<AnalysisLogSummary>, String>;

    fn get(&self,
           id: &str)
           -> Result<Option<AnalysisLogRecord>, String>;
}
