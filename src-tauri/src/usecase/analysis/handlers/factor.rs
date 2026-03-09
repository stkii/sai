use serde_json::Value;

use crate::domain::analysis::model::AnalysisResult;
use crate::domain::analysis::rule::{
    normalize_options_object,
    option_bool_from_value,
    sort_table_rows_by_abs_max,
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
            sort_table_rows_by_abs_max(&mut factor.pattern);
            if let Some(structure) = factor.structure.as_mut() {
                sort_table_rows_by_abs_max(structure);
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

#[cfg(test)]
mod tests {
    use serde_json::{
        Value,
        json,
    };

    use crate::domain::analysis::model::{
        AnalysisResult,
        FactorResult,
    };
    use crate::domain::input::table::ParsedDataTable;

    use super::{
        AnalysisMethodHandler,
        FACTOR_HANDLER,
    };

    fn factor_result_with_unsorted_pattern() -> AnalysisResult {
        AnalysisResult::Factor { factor: FactorResult { eigen:
                                                            ParsedDataTable { headers:
                                                                                  vec!["factor".to_string()],
                                                                              rows:
                                                                                  vec![vec![Value::from(1.0)]],
                                                                              note: None,
                                                                              title: None },
                                                        pattern:
                                                            ParsedDataTable { headers:
                                                                                  vec!["f1".to_string(),
                                                                                       "f2".to_string()],
                                                                              rows:
                                                                                  vec![vec![Value::from(0.10),
                                                                                        Value::from(0.20)],
                                                                                   vec![Value::from(0.80),
                                                                                        Value::from(0.10)]],
                                                                              note: None,
                                                                              title: None },
                                                        rotmat:
                                                            ParsedDataTable { headers:
                                                                                  vec!["f1".to_string()],
                                                                              rows:
                                                                                  vec![vec![Value::from(1.0)]],
                                                                              note: None,
                                                                              title: None },
                                                        structure: None,
                                                        phi: None } }
    }

    #[test]
    fn post_process_sorts_factor_loadings_when_enabled() {
        let mut result = factor_result_with_unsorted_pattern();
        let options = json!({ "sort_loadings": true });

        FACTOR_HANDLER.post_process(&mut result, &options).unwrap();

        let AnalysisResult::Factor { factor } = result else {
            panic!("factor result expected");
        };
        assert_eq!(factor.pattern.rows[0], vec![Value::from(0.80), Value::from(0.10)]);
    }
}
