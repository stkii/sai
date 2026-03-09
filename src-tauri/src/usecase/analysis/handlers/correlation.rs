use serde_json::Value;

use crate::domain::analysis::rule::normalize_options_object;

use super::AnalysisMethodHandler;

#[derive(Clone, Copy, Default)]
pub(super) struct CorrelationHandler;

pub(super) static CORRELATION_HANDLER: CorrelationHandler = CorrelationHandler;

impl AnalysisMethodHandler for CorrelationHandler {
    fn normalize_options(&self,
                         options: Option<Value>)
                         -> Value {
        Value::Object(normalize_options_object(options))
    }
}
