use crate::infra::reader::DataResolver;
use crate::usecase::import::service::ImportService;

pub(crate) struct AppState {
    pub import_service: ImportService<DataResolver>,
}

impl AppState {
    pub(crate) fn new() -> Self {
        Self { import_service: ImportService::new(DataResolver) }
    }
}
