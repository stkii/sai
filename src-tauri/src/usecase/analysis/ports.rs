use std::sync::Arc;

use serde_json::Value;

use crate::domain::analysis::method::Method;
use crate::domain::analysis::model::AnalysisResult;
use crate::domain::input::numeric::{
    NumericDataset,
    NumericDatasetEntry,
};

pub(crate) trait AnalysisRunner: Send + Sync {
    fn run_r_analysis(&self,
                      method: Method,
                      dataset: &NumericDataset,
                      options: &Value)
                      -> Result<AnalysisResult, String>;
}

pub(crate) trait DatasetCacheStore: Send + Sync {
    fn get_numeric_dataset(&self,
                           dataset_cache_id: &str)
                           -> Result<Option<Arc<NumericDatasetEntry>>, String>;
}
