use serde::Serialize;
use serde_json::Value;

use crate::domain::analysis_log::model::{
    AnalysisDatasetRef,
    AnalysisLogRecord,
};

use super::run_analysis::{
    AnalysisResultDto,
    map_sections,
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
pub(crate) struct AnalysisLogRecordDto {
    schema_version: u32,
    id: String,
    timestamp: String,
    #[serde(rename = "type")]
    analysis_type: String,
    dataset: AnalysisDatasetRefDto,
    variables: Vec<String>,
    options: Value,
    result: AnalysisResultDto,
}

impl From<AnalysisLogRecord> for AnalysisLogRecordDto {
    fn from(value: AnalysisLogRecord) -> Self {
        Self { schema_version: value.schema_version,
               id: value.id,
               timestamp: value.timestamp,
               analysis_type: value.analysis_type,
               dataset: value.dataset.into(),
               variables: value.variables,
               options: value.options,
               result: AnalysisResultDto { sections: map_sections(value.result) } }
    }
}

#[tauri::command]
pub fn get_analysis_log(state: tauri::State<'_, crate::bootstrap::state::AppState>,
                        id: String)
                        -> Result<Option<AnalysisLogRecordDto>, String> {
    state.analysis_log_service
         .get(&id)
         .map(|record| record.map(Into::into))
}
