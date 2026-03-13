use std::str::FromStr;

use serde::Serialize;
use serde_json::Value;

use crate::domain::analysis::error::{
    AnalysisErrorKind,
    classified_error,
};
use crate::domain::analysis::method::Method;
use crate::domain::analysis::model::{
    AnalysisResult,
    AnalysisRunResult,
};
use crate::domain::input::table::ParsedDataTable;

#[derive(Debug, Serialize)]
pub(crate) struct AnalysisSectionDto {
    key: String,
    label: String,
    table: ParsedDataTable,
}

#[derive(Debug, Serialize)]
pub(crate) struct AnalysisResultDto {
    pub(super) sections: Vec<AnalysisSectionDto>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AnalysisRunResponseDto {
    analysis_id: String,
    logged_at: String,
    result: AnalysisResultDto,
}

impl From<AnalysisRunResult> for AnalysisRunResponseDto {
    fn from(value: AnalysisRunResult) -> Self {
        let sections = map_sections(value.result);
        Self { analysis_id: value.analysis_id,
               logged_at: value.logged_at,
               result: AnalysisResultDto { sections } }
    }
}

#[tauri::command]
pub fn run_analysis(state: tauri::State<'_, crate::bootstrap::state::AppState>,
                    dataset_cache_id: String,
                    analysis_type: String,
                    options: Option<Value>)
                    -> Result<AnalysisRunResponseDto, String> {
    log::info!("analysis.run_analysis start dataset_cache_id={} type={}",
               dataset_cache_id,
               analysis_type);

    let method = Method::from_str(&analysis_type).map_err(|e| {
                     let err = classified_error(AnalysisErrorKind::InputValidation, e);
                     log::error!("analysis.run_analysis failed dataset_cache_id={} type={} err={}",
                                 dataset_cache_id,
                                 analysis_type,
                                 err);
                     err
                 })?;

    let result = state.analysis_service
                      .run_analysis(&dataset_cache_id, method, options)
                      .map_err(|e| {
                          log::error!("analysis.run_analysis failed dataset_cache_id={} type={} err={}",
                                      dataset_cache_id,
                                      method.as_str(),
                                      e);
                          e
                      })?;

    log::info!("analysis.run_analysis ok dataset_cache_id={} type={}",
               dataset_cache_id,
               method.as_str());
    Ok(result.into())
}

fn section(key: &str,
           label: &str,
           table: ParsedDataTable)
           -> AnalysisSectionDto {
    AnalysisSectionDto { key: key.to_string(),
                         label: label.to_string(),
                         table }
}

pub(super) fn map_sections(result: AnalysisResult) -> Vec<AnalysisSectionDto> {
    match result {
        AnalysisResult::Table { table } => vec![section("table", "結果", table)],
        AnalysisResult::Regression { regression } => {
            vec![section("model_summary", "モデル要約", regression.model_summary),
                 section("coefficients", "係数", regression.coefficients),
                 section("anova", "ANOVA", regression.anova),]
        },
        AnalysisResult::Factor { factor } => {
            let mut sections = vec![section("eigen", "固有値", factor.eigen),
                                    section("pattern", "因子負荷量", factor.pattern),
                                    section("rotmat", "回転行列", factor.rotmat),];

            if let Some(structure) = factor.structure {
                sections.push(section("structure", "構造行列", structure));
            }
            if let Some(phi) = factor.phi {
                sections.push(section("phi", "因子相関", phi));
            }

            sections
        },
    }
}

#[cfg(test)]
mod tests {
    use serde_json::Value;

    use crate::domain::analysis::model::{
        AnalysisResult,
        FactorResult,
        RegressionResult,
    };
    use crate::domain::input::table::ParsedDataTable;

    use super::map_sections;

    fn table(headers: &[&str],
             rows: Vec<Vec<Value>>)
             -> ParsedDataTable {
        ParsedDataTable { headers: headers.iter().map(|v| v.to_string()).collect(),
                          rows,
                          note: None,
                          title: None }
    }

    #[test]
    fn map_sections_for_regression_has_three_sections() {
        let result = AnalysisResult::Regression { regression:
                                                      RegressionResult { model_summary:
                                                                             table(&["item", "value"],
                                                                                   vec![vec!["A".into(),
                                                                                             1.into()]]),
                                                                         coefficients:
                                                                             table(&["name", "coef"],
                                                                                   vec![vec!["x".into(),
                                                                                             0.5.into()]]),
                                                                         anova: table(&["ss", "df"],
                                                                                      vec![vec![10.into(),
                                                                                             2.into()]]) } };

        let sections = map_sections(result);
        assert_eq!(sections.len(), 3);
        assert_eq!(sections[0].key, "model_summary");
        assert_eq!(sections[1].key, "coefficients");
        assert_eq!(sections[2].key, "anova");
    }

    #[test]
    fn map_sections_for_factor_includes_optional_sections() {
        let result =
            AnalysisResult::Factor { factor: FactorResult { eigen: table(&["f"], vec![vec![1.into()]]),
                                                            pattern: table(&["f1"],
                                                                           vec![vec![0.7.into()]]),
                                                            rotmat: table(&["f1"],
                                                                          vec![vec![1.into()]]),
                                                            structure:
                                                                Some(table(&["f1"], vec![vec![0.8.into()]])),
                                                            phi: Some(table(&["f1"],
                                                                            vec![vec![0.2.into()]])) } };

        let sections = map_sections(result);
        assert_eq!(sections.len(), 5);
        assert_eq!(sections[3].key, "structure");
        assert_eq!(sections[4].key, "phi");
    }
}
