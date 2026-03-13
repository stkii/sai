use serde_json::Value;

use crate::domain::analysis::rule::{
    normalize_options_object,
    option_string_from_value,
};

use super::AnalysisMethodHandler;

#[derive(Clone, Copy, Default)]
pub(super) struct ReliabilityHandler;

pub(super) static RELIABILITY_HANDLER: ReliabilityHandler = ReliabilityHandler;

impl AnalysisMethodHandler for ReliabilityHandler {
    fn normalize_options(&self,
                         options: Option<Value>)
                         -> Value {
        let mut normalized = normalize_options_object(options);

        let model = option_string_from_value(normalized.get("model")).unwrap_or_else(|| "alpha".to_string());

        normalized.insert("model".to_string(), Value::String(model));

        Value::Object(normalized)
    }
}
