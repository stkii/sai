use serde_json::Value;

use crate::domain::analysis::method::Method;
use crate::domain::analysis::model::AnalysisResult;
use crate::domain::input::numeric::NumericDataset;
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
}
