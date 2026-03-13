use crate::domain::analysis_log::model::{
    AnalysisLogRecord,
    AnalysisLogSummary,
};

use super::ports::AnalysisLogStore;

#[derive(Clone)]
pub(crate) struct AnalysisLogService<S: AnalysisLogStore> {
    store: S,
}

impl<S: AnalysisLogStore> AnalysisLogService<S> {
    pub(crate) fn new(store: S) -> Self {
        Self { store }
    }

    pub(crate) fn list(&self,
                       limit: Option<usize>)
                       -> Result<Vec<AnalysisLogSummary>, String> {
        self.store.list(limit)
    }

    pub(crate) fn get(&self,
                      id: &str)
                      -> Result<Option<AnalysisLogRecord>, String> {
        self.store.get(id)
    }
}
