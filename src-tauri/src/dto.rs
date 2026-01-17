use serde::{
    Deserialize,
    Serialize,
};

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
#[serde(untagged)]
pub enum AnalysisResult {
    Regression(RegressionResult),
    Table(ParsedDataTable),
}

impl AnalysisResult {
    pub fn validate(&self) -> Result<(), String> {
        match self {
            AnalysisResult::Regression(r) => r.validate(),
            AnalysisResult::Table(t) => t.validate(),
        }
    }
}
