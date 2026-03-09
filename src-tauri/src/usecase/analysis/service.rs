use chrono::Local;
use serde_json::Value;
use uuid::Uuid;

use super::handlers::resolve_handler;
use super::ports::{
    AnalysisRunner,
    DatasetCacheStore,
};

use crate::domain::analysis::error::{
    AnalysisErrorKind,
    classified_error,
    classified_error_with_source,
};
use crate::domain::analysis::method::Method;
use crate::domain::analysis::model::AnalysisRunResult;

pub(crate) struct AnalysisService<C: DatasetCacheStore, R: AnalysisRunner> {
    cache: C,
    runner: R,
}

impl<C: DatasetCacheStore, R: AnalysisRunner> AnalysisService<C, R> {
    pub(crate) fn new(cache: C,
                      runner: R)
                      -> Self {
        Self { cache, runner }
    }

    pub(crate) fn run_analysis(&self,
                               dataset_cache_id: &str,
                               method: Method,
                               options: Option<Value>)
                               -> Result<AnalysisRunResult, String> {
        if dataset_cache_id.trim().is_empty() {
            return Err(classified_error(AnalysisErrorKind::InputValidation, "dataset cache id is empty"));
        }

        let entry = self.cache
                        .get_numeric_dataset(dataset_cache_id)
                        .map_err(|e| {
                            classified_error_with_source(AnalysisErrorKind::DatasetNotFound,
                                                         "failed to read dataset cache",
                                                         e)
                        })?
                        .ok_or_else(|| {
                            classified_error(AnalysisErrorKind::DatasetNotFound,
                                             format!("dataset cache id '{}' was not found", dataset_cache_id))
                        })?;
        log::info!("analysis.run_analysis source path={} sheet={} vars={}",
                   entry.path.as_str(),
                   entry.sheet.as_str(),
                   entry.variables.len());

        let handler = resolve_handler(method);
        let normalized = handler.normalize_options(options);
        let mut result = self.runner.run_r_analysis(method, &entry.dataset, &normalized)?;
        handler.post_process(&mut result, &normalized)?;

        let logged_at = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let analysis_id = Uuid::new_v4().to_string();
        Ok(AnalysisRunResult { analysis_id,
                               logged_at,
                               result })
    }
}
