use std::path::PathBuf;
use std::sync::Arc;

use crate::infra::cache::dataset_cache::DatasetCache;
use crate::infra::r::runner::{
    RRunner,
    default_script_path,
};
use crate::infra::r::transformer::Transformer;
use crate::infra::reader::spss::SavReader;
use crate::infra::store::history_store::HistoryStore;
use crate::services::analysis::AnalysisService;
use crate::services::dataset::DatasetService;
use crate::services::history::HistoryService;

pub struct AppState {
    pub dataset: DatasetService,
    pub analysis: AnalysisService,
    pub history: HistoryService,
}

impl AppState {
    pub fn new(history_path: PathBuf) -> Self {
        let cache = Arc::new(DatasetCache::new());
        let history_store = Arc::new(HistoryStore::new(history_path));
        Self { dataset: DatasetService::new(cache.clone(),
                                            SavReader::new(default_script_path("read_sav.R")),
                                            Transformer::new(default_script_path("transform.R"))),
               analysis: AnalysisService::new(cache, RRunner::new(default_script_path("cli.R"))),
               history: HistoryService::new(history_store) }
    }
}
