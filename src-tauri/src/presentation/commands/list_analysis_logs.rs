use super::analysis_log_dto::AnalysisLogSummaryDto;

#[tauri::command]
pub fn list_analysis_logs(state: tauri::State<'_, crate::bootstrap::state::AppState>,
                          limit: Option<usize>)
                          -> Result<Vec<AnalysisLogSummaryDto>, String> {
    state.persistent_analysis_log_service
         .list(limit)
         .map(|items| items.into_iter().map(Into::into).collect())
}
