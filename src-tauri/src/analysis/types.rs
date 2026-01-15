use crate::dto::ParsedDataTable;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisRunResult {
    pub result: ParsedDataTable,
    pub logged_at: String,
}
