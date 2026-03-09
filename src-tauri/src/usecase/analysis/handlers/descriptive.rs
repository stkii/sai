use serde_json::Value;

use crate::domain::analysis::rule::{
    normalize_options_object,
    option_bool_from_value,
    option_string_from_value,
};

use super::AnalysisMethodHandler;

#[derive(Clone, Copy, Default)]
pub(super) struct DescriptiveHandler;

pub(super) static DESCRIPTIVE_HANDLER: DescriptiveHandler = DescriptiveHandler;

impl AnalysisMethodHandler for DescriptiveHandler {
    fn normalize_options(&self,
                         options: Option<Value>)
                         -> Value {
        let mut normalized = normalize_options_object(options);

        let order =
            option_string_from_value(normalized.get("order")).unwrap_or_else(|| "default".to_string());
        let na_ignore = normalized.get("na_ignore")
                                  .and_then(option_bool_from_value)
                                  .or_else(|| normalized.get("naIgnore").and_then(option_bool_from_value))
                                  .unwrap_or(true);

        normalized.insert("order".to_string(), Value::String(order));
        normalized.insert("na_ignore".to_string(), Value::Bool(na_ignore));
        normalized.remove("naIgnore");

        Value::Object(normalized)
    }
}
