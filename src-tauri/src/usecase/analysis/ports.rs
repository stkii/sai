use std::sync::Arc;

use serde_json::Value;

use crate::domain::analysis::method::Method;
use crate::domain::analysis::model::AnalysisResult;
use crate::domain::input::numeric::{
    NumericDataset,
    NumericDatasetEntry,
};
use crate::domain::input::string_mixed::{
    StringMixedDataset,
    StringMixedDatasetEntry,
};

pub(crate) trait AnalysisRunner: Send + Sync {
    fn run_r_analysis(&self,
                      method: Method,
                      dataset: &NumericDataset,
                      options: &Value)
                      -> Result<AnalysisResult, String>;

    fn run_r_analysis_string_mixed(&self,
                                   method: Method,
                                   dataset: &StringMixedDataset,
                                   options: &Value)
                                   -> Result<AnalysisResult, String>;
}

pub(crate) trait DatasetCacheStore: Send + Sync {
    fn get_numeric_dataset(&self,
                           dataset_cache_id: &str)
                           -> Result<Option<Arc<NumericDatasetEntry>>, String>;

    fn get_string_mixed_dataset(&self,
                                dataset_cache_id: &str)
                                -> Result<Option<Arc<StringMixedDatasetEntry>>, String>;
}
