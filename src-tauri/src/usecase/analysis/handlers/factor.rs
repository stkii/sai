use serde_json::Value;

use crate::domain::analysis::model::AnalysisResult;
use crate::domain::analysis::rule::{
    normalize_options_object,
    option_bool_from_value,
    sort_table_rows_by_factor_group,
};

use super::AnalysisMethodHandler;

#[derive(Clone, Copy, Default)]
pub(super) struct FactorHandler;

pub(super) static FACTOR_HANDLER: FactorHandler = FactorHandler;

impl AnalysisMethodHandler for FactorHandler {
    fn normalize_options(&self,
                         options: Option<Value>)
                         -> Value {
        let mut normalized = normalize_options_object(options);

        let sort_loadings =
            normalized.get("sort_loadings")
                      .and_then(option_bool_from_value)
                      .or_else(|| normalized.get("sortLoadings").and_then(option_bool_from_value))
                      .unwrap_or(false);

        normalized.insert("sort_loadings".to_string(), Value::Bool(sort_loadings));
        normalized.remove("sortLoadings");

        let show_scree_plot =
            normalized.get("show_scree_plot")
                      .and_then(option_bool_from_value)
                      .or_else(|| normalized.get("showScreePlot").and_then(option_bool_from_value))
                      .unwrap_or(false);

        normalized.insert("show_scree_plot".to_string(), Value::Bool(show_scree_plot));
        normalized.remove("showScreePlot");

        Value::Object(normalized)
    }

    fn post_process(&self,
                    result: &mut AnalysisResult,
                    normalized_options: &Value)
                    -> Result<(), String> {
        if !should_sort_loadings(normalized_options) {
            return Ok(());
        }

        if let AnalysisResult::Factor { factor } = result {
            sort_table_rows_by_factor_group(&mut factor.pattern);
            if let Some(structure) = factor.structure.as_mut() {
                sort_table_rows_by_factor_group(structure);
            }
        }
        Ok(())
    }
}

fn should_sort_loadings(normalized_options: &Value) -> bool {
    normalized_options.as_object()
                      .and_then(|map| map.get("sort_loadings"))
                      .and_then(option_bool_from_value)
                      .unwrap_or(false)
}
