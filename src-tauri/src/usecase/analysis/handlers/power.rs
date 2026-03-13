use serde_json::Value;

use crate::domain::analysis::rule::normalize_options_object;

use super::AnalysisMethodHandler;

#[derive(Clone, Copy, Default)]
pub(super) struct PowerHandler;

pub(super) static POWER_HANDLER: PowerHandler = PowerHandler;

impl AnalysisMethodHandler for PowerHandler {
    fn normalize_options(&self,
                         options: Option<Value>)
                         -> Value {
        Value::Object(normalize_options_object(options))
    }
}
