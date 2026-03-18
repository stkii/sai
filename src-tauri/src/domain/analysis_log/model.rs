use serde::{
    Deserialize,
    Serialize,
};
use serde_json::Value;

use crate::domain::analysis::model::AnalysisResult;

pub(crate) const ANALYSIS_LOG_SCHEMA_VERSION: u32 = 1;

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AnalysisDatasetRef {
    pub path: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sheet: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AnalysisLogRecord {
    pub schema_version: u32,
    pub id: String,
    pub timestamp: String,
    #[serde(rename = "type")]
    pub analysis_type: String,
    pub dataset: AnalysisDatasetRef,
    pub variables: Vec<String>,
    pub options: Value,
    pub result: AnalysisResult,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub n: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub n_note: Option<String>,
}

impl AnalysisLogRecord {
    pub(crate) fn summary(&self) -> AnalysisLogSummary {
        AnalysisLogSummary { id: self.id.clone(),
                             analysis_type: self.analysis_type.clone(),
                             timestamp: self.timestamp.clone(),
                             dataset: self.dataset.clone() }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AnalysisLogSummary {
    pub id: String,
    #[serde(rename = "type")]
    pub analysis_type: String,
    pub timestamp: String,
    pub dataset: AnalysisDatasetRef,
}
