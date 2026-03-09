mod correlation;
mod descriptive;
mod factor;

use serde_json::Value;

use crate::domain::analysis::method::Method;
use crate::domain::analysis::model::AnalysisResult;

pub(crate) trait AnalysisMethodHandler: Send + Sync {
    fn normalize_options(&self,
                         options: Option<Value>)
                         -> Value;

    fn post_process(&self,
                    _result: &mut AnalysisResult,
                    _normalized_options: &Value)
                    -> Result<(), String> {
        Ok(())
    }
}

pub(crate) fn resolve_handler(method: Method) -> &'static dyn AnalysisMethodHandler {
    if method == Method::DESCRIPTIVE {
        &descriptive::DESCRIPTIVE_HANDLER
    } else if method == Method::FACTOR {
        &factor::FACTOR_HANDLER
    } else {
        &correlation::CORRELATION_HANDLER
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use crate::domain::analysis::method::Method;

    use super::resolve_handler;

    #[test]
    fn descriptive_handler_applies_defaults() {
        let normalized = resolve_handler(Method::DESCRIPTIVE).normalize_options(None);
        let object = normalized.as_object().expect("normalized options must be object");

        assert_eq!(object.get("order"), Some(&json!("default")));
        assert_eq!(object.get("na_ignore"), Some(&json!(true)));
    }

    #[test]
    fn factor_handler_normalizes_sort_loadings_alias() {
        let normalized =
            resolve_handler(Method::FACTOR).normalize_options(Some(json!({ "sortLoadings": "1" })));
        let object = normalized.as_object().expect("normalized options must be object");

        assert_eq!(object.get("sort_loadings"), Some(&json!(true)));
        assert_eq!(object.get("sortLoadings"), None);
    }
}
