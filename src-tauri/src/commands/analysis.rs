use serde_json::Value;
use tauri::State;

use crate::bootstrap::AppState;
use crate::models::AnalysisResult;

#[tauri::command]
pub fn run_analysis(dataset_key: Option<String>,
                    method: String,
                    variables: Vec<String>,
                    options: Option<Value>,
                    state: State<'_, AppState>)
                    -> Result<AnalysisResult, String> {
    state.analysis.run(&state.cache,
                       dataset_key.as_deref(),
                       &method,
                       &variables,
                       options.unwrap_or(Value::Null))
}
