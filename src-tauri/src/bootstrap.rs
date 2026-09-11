use std::path::PathBuf;
use std::sync::Arc;

use crate::infra::cache::dataset_cache::DatasetCache;
use crate::infra::r::runner::RRunner;
use crate::infra::r::transformer::Transformer;
use crate::infra::reader::spss::SavReader;
use crate::infra::store::history_store::HistoryStore;
use crate::services::analysis::AnalysisService;
use crate::services::dataset::DatasetService;
use crate::services::history::HistoryService;

pub struct AppState {
    pub dataset: Arc<DatasetService>,
    pub analysis: Arc<AnalysisService>,
    pub history: HistoryService,
}

impl AppState {
    pub fn new(history_path: PathBuf,
               r_dir: PathBuf)
               -> Self {
        let cache = Arc::new(DatasetCache::new());
        let history_store = Arc::new(HistoryStore::new(history_path));
        Self { dataset: Arc::new(DatasetService::new(cache.clone(),
                                                     SavReader::new(r_dir.join("read_sav.R")),
                                                     Transformer::new(r_dir.join("transform.R")))),
               analysis: Arc::new(AnalysisService::new(cache, RRunner::new(r_dir.join("cli.R")))),
               history: HistoryService::new(history_store) }
    }
}
