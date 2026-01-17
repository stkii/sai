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
pub struct RegressionModelInfo {
    pub r_squared: Option<String>,
    pub adj_r_squared: Option<String>,
    pub n: Option<i64>,
    pub f_statistic: Option<String>,
    pub f_df1: Option<i64>,
    pub f_df2: Option<i64>,
    pub f_pvalue: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RegressionResult {
    pub coefficients: ParsedDataTable,
    pub anova: ParsedDataTable,
    pub model: RegressionModelInfo,
}

impl RegressionResult {
    pub fn validate(&self) -> Result<(), String> {
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
