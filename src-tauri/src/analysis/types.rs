use crate::dto::AnalysisResult;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisRunResult {
    pub result: AnalysisResult,
    pub logged_at: String,
    pub analysis_id: String,
}
