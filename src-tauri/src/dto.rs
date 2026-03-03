use indexmap::IndexMap;
use serde::{
    Deserialize,
    Serialize,
};

pub type NumericDataset = IndexMap<String, Vec<Option<f64>>>;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ParsedDataTable {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}

impl ParsedDataTable {
    pub fn validate(&self) -> Result<(), String> {
        let w = self.headers.len();
        for (i, row) in self.rows.iter().enumerate() {
            if row.len() != w {
                return Err(format!("ParsedDataTable validation error: row {} length {} != headers {}",
                                   i,
                                   row.len(),
                                   w));
            }
            for (j, cell) in row.iter().enumerate() {
                match cell {
                    serde_json::Value::Null
                    | serde_json::Value::Bool(_)
                    | serde_json::Value::Number(_)
                    | serde_json::Value::String(_) => {},
                    _ => {
                        return Err(format!("ParsedDataTable validation error: rows[{}][{}] has unsupported type",
                                           i, j));
                    },
                }
            }
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RegressionResult {
    pub model_summary: ParsedDataTable,
    pub coefficients: ParsedDataTable,
    pub anova: ParsedDataTable,
}

impl RegressionResult {
    pub fn validate(&self) -> Result<(), String> {
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
pub struct FactorResult {
    pub eigen: ParsedDataTable,
    pub pattern: ParsedDataTable,
    pub rotmat: ParsedDataTable,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub structure: Option<ParsedDataTable>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub phi: Option<ParsedDataTable>,
}

impl FactorResult {
    pub fn validate(&self) -> Result<(), String> {
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
pub enum AnalysisResult {
    Table { table: ParsedDataTable },
    Regression { regression: RegressionResult },
    Factor { factor: FactorResult },
}

impl AnalysisResult {
    pub fn validate(&self) -> Result<(), String> {
        match self {
            AnalysisResult::Regression { regression } => regression.validate(),
            AnalysisResult::Table { table } => table.validate(),
            AnalysisResult::Factor { factor } => factor.validate(),
        }
    }
}
