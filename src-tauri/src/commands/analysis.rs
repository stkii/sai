use serde_json::Value;
use tauri::State;

use crate::bootstrap::AppState;
use crate::models::AnalysisResult;

#[tauri::command]
pub async fn run_analysis(dataset_key: Option<String>,
                          method: String,
                          variables: Vec<String>,
                          options: Option<Value>,
                          state: State<'_, AppState>)
                          -> Result<AnalysisResult, String> {
    let analysis = state.analysis.clone();
    tauri::async_runtime::spawn_blocking(move || {
        analysis.run(dataset_key.as_deref(), &method, &variables, options)
    }).await
      .map_err(|e| format!("分析処理の実行失敗: {e}"))?
}
