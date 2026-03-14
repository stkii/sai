use crate::domain::analysis_log::model::{
    AnalysisLogRecord,
    AnalysisLogSummary,
};

pub(crate) trait AnalysisLogWriter: Send + Sync {
    fn append(&self,
              record: &AnalysisLogRecord)
              -> Result<(), String>;
}

pub(crate) trait AnalysisLogReader: Send + Sync {
    fn list(&self,
            limit: Option<usize>)
            -> Result<Vec<AnalysisLogSummary>, String>;

    fn get(&self,
           id: &str)
           -> Result<Option<AnalysisLogRecord>, String>;
}

pub(crate) trait SessionAnalysisLogReader: Send + Sync {
    fn list(&self,
            limit: Option<usize>)
            -> Result<Vec<AnalysisLogSummary>, String>;

    fn contains(&self,
                id: &str)
                -> Result<bool, String>;
}
