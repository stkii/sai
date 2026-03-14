use crate::domain::analysis_log::model::{
    AnalysisLogRecord,
    AnalysisLogSummary,
};

use super::ports::{
    AnalysisLogReader,
    SessionAnalysisLogReader,
};

#[derive(Clone)]
pub(crate) struct AnalysisLogService<R: AnalysisLogReader> {
    reader: R,
}

impl<R: AnalysisLogReader> AnalysisLogService<R> {
    pub(crate) fn new(reader: R) -> Self {
        Self { reader }
    }

    pub(crate) fn list(&self,
                       limit: Option<usize>)
                       -> Result<Vec<AnalysisLogSummary>, String> {
        self.reader.list(limit)
    }

    pub(crate) fn get(&self,
                      id: &str)
                      -> Result<Option<AnalysisLogRecord>, String> {
        self.reader.get(id)
    }
}

#[derive(Clone)]
pub(crate) struct SessionAnalysisLogService<R: SessionAnalysisLogReader> {
    reader: R,
}

impl<R: SessionAnalysisLogReader> SessionAnalysisLogService<R> {
    pub(crate) fn new(reader: R) -> Self {
        Self { reader }
    }

    pub(crate) fn list(&self,
                       limit: Option<usize>)
                       -> Result<Vec<AnalysisLogSummary>, String> {
        self.reader.list(limit)
    }

    pub(crate) fn contains(&self,
                           id: &str)
                           -> Result<bool, String> {
        self.reader.contains(id)
    }
}
