use crate::infra::cache::repository::DatasetCacheRepository;
use crate::infra::r::analyzer::RAnalyzer;
use crate::infra::reader::DataResolver;
use crate::usecase::analysis::service::AnalysisService;
use crate::usecase::import::service::ImportService;

pub(crate) struct AppState {
    pub analysis_service: AnalysisService<DatasetCacheRepository, RAnalyzer>,
    pub import_service: ImportService<DataResolver, DatasetCacheRepository>,
}

impl AppState {
    pub(crate) fn new() -> Self {
        Self { analysis_service: AnalysisService::new(DatasetCacheRepository, RAnalyzer),
               import_service: ImportService::new(DataResolver, DatasetCacheRepository) }
    }
}
