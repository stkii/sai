use super::analysis_log_dto::AnalysisLogRecordDto;

#[tauri::command]
pub fn get_session_analysis_log(state: tauri::State<'_, crate::bootstrap::state::AppState>,
                                id: String)
                                -> Result<Option<AnalysisLogRecordDto>, String> {
    if !state.session_analysis_log_service.contains(&id)? {
        return Ok(None);
    }

    state.persistent_analysis_log_service
         .get(&id)
         .map(|record| record.map(Into::into))
}
