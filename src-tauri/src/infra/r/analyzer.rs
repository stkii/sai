use serde_json::Value;

use crate::domain::analysis::method::Method;
use crate::domain::analysis::model::AnalysisResult;
use crate::domain::input::numeric::NumericDataset;
use crate::domain::input::string_mixed::StringMixedDataset;
use crate::usecase::analysis::ports::AnalysisRunner;

use super::runner;

#[derive(Clone, Copy, Default)]
pub(crate) struct RAnalyzer;

impl AnalysisRunner for RAnalyzer {
    fn run_r_analysis(&self,
                      method: Method,
                      dataset: &NumericDataset,
                      options: &Value)
                      -> Result<AnalysisResult, String> {
        runner::run_r_analysis(method, dataset, options)
    }

    fn run_r_analysis_string_mixed(&self,
                                   method: Method,
                                   dataset: &StringMixedDataset,
                                   options: &Value)
                                   -> Result<AnalysisResult, String> {
        runner::run_r_analysis_string_mixed(method, dataset, options)
    }
}
