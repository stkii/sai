use super::analysis_log_dto::AnalysisLogRecordDto;

#[tauri::command]
pub fn get_analysis_log(state: tauri::State<'_, crate::bootstrap::state::AppState>,
                        id: String)
                        -> Result<Option<AnalysisLogRecordDto>, String> {
    state.persistent_analysis_log_service
         .get(&id)
         .map(|record| record.map(Into::into))
}
