use serde_json::Value;

use crate::domain::analysis::rule::normalize_options_object;

use super::AnalysisMethodHandler;

#[derive(Clone, Copy, Default)]
pub(super) struct AnovaHandler;

pub(super) static ANOVA_HANDLER: AnovaHandler = AnovaHandler;

impl AnalysisMethodHandler for AnovaHandler {
    fn normalize_options(&self,
                         options: Option<Value>)
                         -> Value {
        Value::Object(normalize_options_object(options))
    }
}
