use crate::infra::analysis_log::jsonl_repository::JsonlAnalysisLogRepository;
use crate::infra::analysis_log::session_repository::SessionAnalysisLogRepository;
use crate::infra::cache::repository::DatasetCacheRepository;
use crate::infra::r::analyzer::RAnalyzer;
use crate::infra::reader::DataResolver;
use crate::usecase::analysis::service::AnalysisService;
use crate::usecase::analysis_log::multi_writer::MultiAnalysisLogWriter;
use crate::usecase::analysis_log::service::{
    AnalysisLogService,
    SessionAnalysisLogService,
};
use crate::usecase::import::service::ImportService;
use tauri::Manager;

const ANALYSIS_LOG_MAX_FILE_SIZE_BYTES: u64 = 5 * 1024 * 1024;

type AppAnalysisLogWriter = MultiAnalysisLogWriter<JsonlAnalysisLogRepository, SessionAnalysisLogRepository>;

pub(crate) struct AppState {
    pub analysis_service: AnalysisService<DatasetCacheRepository, RAnalyzer, AppAnalysisLogWriter>,
    pub persistent_analysis_log_service: AnalysisLogService<JsonlAnalysisLogRepository>,
    pub session_analysis_log_service: SessionAnalysisLogService<SessionAnalysisLogRepository>,
    pub import_service: ImportService<DataResolver, DatasetCacheRepository>,
}

impl AppState {
    pub(crate) fn new(app_handle: tauri::AppHandle<tauri::Wry>) -> Result<Self, String> {
        let base_dir = app_handle.path()
                                 .app_data_dir()
                                 .map_err(|e| format!("failed to resolve app data directory: {}", e))?
                                 .join("analysis-logs");
        let persistent_log_repository =
            JsonlAnalysisLogRepository::new(base_dir, ANALYSIS_LOG_MAX_FILE_SIZE_BYTES);
        let session_log_repository = SessionAnalysisLogRepository::default();
        let analysis_log_writer =
            MultiAnalysisLogWriter::new(persistent_log_repository.clone(), session_log_repository.clone());

        Ok(Self { analysis_service: AnalysisService::new(DatasetCacheRepository,
                                                         RAnalyzer,
                                                         analysis_log_writer),
                  persistent_analysis_log_service: AnalysisLogService::new(persistent_log_repository),
                  session_analysis_log_service: SessionAnalysisLogService::new(session_log_repository),
                  import_service: ImportService::new(DataResolver, DatasetCacheRepository) })
    }
}
