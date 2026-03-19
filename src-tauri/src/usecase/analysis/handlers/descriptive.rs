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
        let skewness = normalized.get("skewness")
                                 .and_then(option_bool_from_value)
                                 .unwrap_or(false);
        let kurtosis = normalized.get("kurtosis")
                                 .and_then(option_bool_from_value)
                                 .unwrap_or(false);
        let histogram =
            option_string_from_value(normalized.get("histogram")).unwrap_or_else(|| "none".to_string());
        let breaks =
            option_string_from_value(normalized.get("breaks")).unwrap_or_else(|| "Sturges".to_string());
        // histogram_variables is passed through as-is (array of strings)

        normalized.insert("order".to_string(), Value::String(order));
        normalized.insert("na_ignore".to_string(), Value::Bool(na_ignore));
        normalized.insert("skewness".to_string(), Value::Bool(skewness));
        normalized.insert("kurtosis".to_string(), Value::Bool(kurtosis));
        normalized.insert("histogram".to_string(), Value::String(histogram));
        normalized.insert("breaks".to_string(), Value::String(breaks));
        normalized.remove("naIgnore");

        Value::Object(normalized)
    }
}
