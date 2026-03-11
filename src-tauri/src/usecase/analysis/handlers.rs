mod correlation;
mod descriptive;
mod factor;
mod regression;

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
    } else if method == Method::REGRESSION {
        &regression::REGRESSION_HANDLER
    } else {
        &correlation::CORRELATION_HANDLER
    }
}
