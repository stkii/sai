use serde_json::Value;

use crate::domain::analysis::rule::normalize_options_object;

use super::AnalysisMethodHandler;

#[derive(Clone, Copy, Default)]
pub(super) struct RegressionHandler;

pub(super) static REGRESSION_HANDLER: RegressionHandler = RegressionHandler;

impl AnalysisMethodHandler for RegressionHandler {
    fn normalize_options(&self,
                         options: Option<Value>)
                         -> Value {
        Value::Object(normalize_options_object(options))
    }
}
