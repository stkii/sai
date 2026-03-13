use crate::infra::analysis_log::jsonl_repository::JsonlAnalysisLogRepository;
use crate::infra::cache::repository::DatasetCacheRepository;
use crate::infra::r::analyzer::RAnalyzer;
use crate::infra::reader::DataResolver;
use crate::usecase::analysis::service::AnalysisService;
use crate::usecase::analysis_log::service::AnalysisLogService;
use crate::usecase::import::service::ImportService;
use tauri::Manager;

const ANALYSIS_LOG_MAX_FILE_SIZE_BYTES: u64 = 5 * 1024 * 1024;

pub(crate) struct AppState {
    pub analysis_service: AnalysisService<DatasetCacheRepository, RAnalyzer, JsonlAnalysisLogRepository>,
    pub analysis_log_service: AnalysisLogService<JsonlAnalysisLogRepository>,
    pub import_service: ImportService<DataResolver, DatasetCacheRepository>,
}

impl AppState {
    pub(crate) fn new(app_handle: tauri::AppHandle<tauri::Wry>) -> Result<Self, String> {
        let base_dir = app_handle.path()
                                 .app_data_dir()
                                 .map_err(|e| format!("failed to resolve app data directory: {}", e))?
                                 .join("analysis-logs");
        let log_repository = JsonlAnalysisLogRepository::new(base_dir, ANALYSIS_LOG_MAX_FILE_SIZE_BYTES);

        Ok(Self { analysis_service: AnalysisService::new(DatasetCacheRepository,
                                                         RAnalyzer,
                                                         log_repository.clone()),
                  analysis_log_service: AnalysisLogService::new(log_repository),
                  import_service: ImportService::new(DataResolver, DatasetCacheRepository) })
    }
}
