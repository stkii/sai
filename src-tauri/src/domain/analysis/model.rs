use serde::{
    Deserialize,
    Serialize,
};

use crate::domain::input::table::ParsedDataTable;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub(crate) struct DescriptiveResult {
    pub table: ParsedDataTable,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub histogram: Option<String>,
}

impl DescriptiveResult {
    pub(crate) fn validate(&self) -> Result<(), String> {
        self.table.validate().map_err(|e| format!("table: {}", e))
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub(crate) struct CorrelationResult {
    pub correlation: ParsedDataTable,
    pub t_values: ParsedDataTable,
}

impl CorrelationResult {
    pub(crate) fn validate(&self) -> Result<(), String> {
        self.correlation
            .validate()
            .map_err(|e| format!("correlation: {}", e))?;
        self.t_values.validate().map_err(|e| format!("t_values: {}", e))?;
        Ok(())
    }
}

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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rotmat: Option<ParsedDataTable>,
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
        if let Some(rotmat) = self.rotmat.as_ref() {
            rotmat.validate().map_err(|e| format!("rotmat: {}", e))?;
        }
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
pub(crate) struct AnovaResult {
    pub descriptive: ParsedDataTable,
    pub anova_table: ParsedDataTable,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub comparisons: Option<ParsedDataTable>,
}

impl AnovaResult {
    pub(crate) fn validate(&self) -> Result<(), String> {
        self.descriptive
            .validate()
            .map_err(|e| format!("descriptive: {}", e))?;
        self.anova_table
            .validate()
            .map_err(|e| format!("anova_table: {}", e))?;
        if let Some(comparisons) = self.comparisons.as_ref() {
            comparisons.validate()
                       .map_err(|e| format!("comparisons: {}", e))?;
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub(crate) enum AnalysisResult {
    Table { table: ParsedDataTable },
    Descriptive { descriptive: DescriptiveResult },
    Correlation { correlation: CorrelationResult },
    Regression { regression: RegressionResult },
    Factor { factor: Box<FactorResult> },
    Anova { anova: AnovaResult },
}

impl AnalysisResult {
    pub(crate) fn validate(&self) -> Result<(), String> {
        match self {
            AnalysisResult::Table { table } => table.validate(),
            AnalysisResult::Descriptive { descriptive } => descriptive.validate(),
            AnalysisResult::Correlation { correlation } => correlation.validate(),
            AnalysisResult::Regression { regression } => regression.validate(),
            AnalysisResult::Factor { factor } => factor.validate(),
            AnalysisResult::Anova { anova } => anova.validate(),
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AnalysisRunResult {
    pub analysis_id: String,
    pub logged_at: String,
    pub result: AnalysisResult,
    pub n: Option<u32>,
    pub n_note: Option<String>,
}
