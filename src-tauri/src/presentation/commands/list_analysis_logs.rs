use serde::Serialize;

use crate::domain::analysis_log::model::{
    AnalysisDatasetRef,
    AnalysisLogSummary,
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AnalysisDatasetRefDto {
    path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    sheet: Option<String>,
}

impl From<AnalysisDatasetRef> for AnalysisDatasetRefDto {
    fn from(value: AnalysisDatasetRef) -> Self {
        Self { path: value.path,
               sheet: value.sheet }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AnalysisLogSummaryDto {
    id: String,
    #[serde(rename = "type")]
    analysis_type: String,
    timestamp: String,
    dataset: AnalysisDatasetRefDto,
}

impl From<AnalysisLogSummary> for AnalysisLogSummaryDto {
    fn from(value: AnalysisLogSummary) -> Self {
        Self { id: value.id,
               analysis_type: value.analysis_type,
               timestamp: value.timestamp,
               dataset: value.dataset.into() }
    }
}

#[tauri::command]
pub fn list_analysis_logs(state: tauri::State<'_, crate::bootstrap::state::AppState>,
                          limit: Option<usize>)
                          -> Result<Vec<AnalysisLogSummaryDto>, String> {
    state.analysis_log_service
         .list(limit)
         .map(|items| items.into_iter().map(Into::into).collect())
}
