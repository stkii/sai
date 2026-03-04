use serde::Deserialize;
use serde_json::{
    Map,
    Value,
};

#[derive(Debug)]
pub struct NormalizedAnalysisOptions {
    pub options_for_r: Value,
    pub sort_factor_loadings: bool,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
struct DescriptiveOptionsInput {
    order: Option<Value>,
    #[serde(rename = "na_ignore")]
    na_ignore: Option<Value>,
    #[serde(rename = "naIgnore")]
    na_ignore_legacy: Option<Value>,
    #[serde(flatten)]
    rest: Map<String, Value>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
struct FactorOptionsInput {
    #[serde(rename = "sort_loadings", alias = "sortLoadings")]
    sort_loadings: Option<Value>,
}

pub fn normalize_analysis_options(analysis_type: &str,
                                  options: Option<Value>)
                                  -> NormalizedAnalysisOptions {
    let map = normalize_options_object(options);

    match analysis_type {
        "descriptive" => normalize_descriptive_options(map),
        "factor" => normalize_factor_options(map),
        _ => NormalizedAnalysisOptions { options_for_r: Value::Object(map),
                                         sort_factor_loadings: false },
    }
}

fn normalize_descriptive_options(map: Map<String, Value>) -> NormalizedAnalysisOptions {
    let parsed =
        serde_json::from_value::<DescriptiveOptionsInput>(Value::Object(map.clone())).unwrap_or_default();
    let mut normalized = parsed.rest;

    let order = option_string_from_value(parsed.order.as_ref()).unwrap_or_else(|| "default".to_string());
    let na_ignore = parsed.na_ignore
                          .as_ref()
                          .and_then(option_bool_from_value)
                          .or_else(|| parsed.na_ignore_legacy.as_ref().and_then(option_bool_from_value))
                          .unwrap_or(true);

    normalized.insert("order".to_string(), Value::String(order));
    normalized.insert("na_ignore".to_string(), Value::Bool(na_ignore));

    NormalizedAnalysisOptions { options_for_r: Value::Object(normalized),
                                sort_factor_loadings: false }
}

fn normalize_factor_options(map: Map<String, Value>) -> NormalizedAnalysisOptions {
    let parsed = serde_json::from_value::<FactorOptionsInput>(Value::Object(map.clone())).unwrap_or_default();
    let sort_factor_loadings = parsed.sort_loadings
                                     .as_ref()
                                     .and_then(option_bool_from_value)
                                     .unwrap_or(false);

    NormalizedAnalysisOptions { options_for_r: Value::Object(map),
                                sort_factor_loadings }
}

fn normalize_options_object(options: Option<Value>) -> Map<String, Value> {
    match options {
        Some(Value::Object(map)) => map,
        Some(value) => {
            let mut map = Map::new();
            map.insert("value".to_string(), value);
            map
        },
        None => Map::new(),
    }
}

fn option_string_from_value(value: Option<&Value>) -> Option<String> {
    let value = value?;
    match value {
        Value::String(value) => {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        },
        Value::Number(value) => Some(value.to_string()),
        _ => None,
    }
}

fn option_bool_from_value(value: &Value) -> Option<bool> {
    match value {
        Value::Bool(value) => Some(*value),
        Value::Number(value) => value.as_i64().map(|n| n != 0),
        Value::String(value) => {
            let value = value.trim().to_ascii_lowercase();
            match value.as_str() {
                "true" | "1" | "yes" => Some(true),
                "false" | "0" | "no" => Some(false),
                _ => None,
            }
        },
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn descriptive_defaults_are_applied() {
        let normalized = normalize_analysis_options("descriptive", None);
        let map = normalized.options_for_r.as_object().unwrap();

        assert_eq!(map.get("order"), Some(&Value::String("default".to_string())));
        assert_eq!(map.get("na_ignore"), Some(&Value::Bool(true)));
        assert!(!normalized.sort_factor_loadings);
    }

    #[test]
    fn descriptive_accepts_legacy_na_ignore() {
        let options =
            Value::Object(Map::from_iter([("naIgnore".to_string(), Value::String("0".to_string()))]));
        let normalized = normalize_analysis_options("descriptive", Some(options));
        let map = normalized.options_for_r.as_object().unwrap();

        assert_eq!(map.get("na_ignore"), Some(&Value::Bool(false)));
    }

    #[test]
    fn factor_sort_loadings_accepts_camel_case() {
        let options = Value::Object(Map::from_iter([("sortLoadings".to_string(), Value::Bool(true))]));
        let normalized = normalize_analysis_options("factor", Some(options));

        assert!(normalized.sort_factor_loadings);
    }

    #[test]
    fn non_object_option_is_wrapped() {
        let normalized = normalize_analysis_options("power", Some(Value::String("raw".to_string())));
        let map = normalized.options_for_r.as_object().unwrap();

        assert_eq!(map.get("value"), Some(&Value::String("raw".to_string())));
    }
}
