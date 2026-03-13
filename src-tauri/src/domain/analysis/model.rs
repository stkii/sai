use serde::{
    Deserialize,
    Serialize,
};

use crate::domain::input::table::ParsedDataTable;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub(crate) struct RegressionResult {
    pub model_summary: ParsedDataTable,
    pub coefficients: ParsedDataTable,
    pub anova: ParsedDataTable,
}

impl RegressionResult {
    pub(crate) fn validate(&self) -> Result<(), String> {
        self.model_summary
            .validate()
            .map_err(|e| format!("model_summary: {}", e))?;
        self.coefficients
            .validate()
            .map_err(|e| format!("coefficients: {}", e))?;
        self.anova.validate().map_err(|e| format!("anova: {}", e))?;
        Ok(())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub(crate) struct FactorResult {
    pub eigen: ParsedDataTable,
    pub pattern: ParsedDataTable,
    pub rotmat: ParsedDataTable,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub structure: Option<ParsedDataTable>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub phi: Option<ParsedDataTable>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scree_plot: Option<String>,
}

impl FactorResult {
    pub(crate) fn validate(&self) -> Result<(), String> {
        self.eigen.validate().map_err(|e| format!("eigen: {}", e))?;
        self.pattern.validate().map_err(|e| format!("pattern: {}", e))?;
        self.rotmat.validate().map_err(|e| format!("rotmat: {}", e))?;
        if let Some(structure) = self.structure.as_ref() {
            structure.validate().map_err(|e| format!("structure: {}", e))?;
        }
        if let Some(phi) = self.phi.as_ref() {
            phi.validate().map_err(|e| format!("phi: {}", e))?;
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub(crate) enum AnalysisResult {
    Table { table: ParsedDataTable },
    Regression { regression: RegressionResult },
    Factor { factor: FactorResult },
}

impl AnalysisResult {
    pub(crate) fn validate(&self) -> Result<(), String> {
        match self {
            AnalysisResult::Regression { regression } => regression.validate(),
            AnalysisResult::Table { table } => table.validate(),
            AnalysisResult::Factor { factor } => factor.validate(),
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AnalysisRunResult {
    pub analysis_id: String,
    pub logged_at: String,
    pub result: AnalysisResult,
}
