use std::sync::Arc;

use crate::infra::store::history_store::HistoryStore;
use crate::models::{
    HistoryLoadResult,
    HistoryRecord,
};

pub struct HistoryService {
    store: Arc<HistoryStore>,
}

impl HistoryService {
    pub fn new(store: Arc<HistoryStore>) -> Self {
        Self { store }
    }

    pub fn append(&self,
                  record: &HistoryRecord)
                  -> Result<(), String> {
        self.store.append(record)
    }

    pub fn load_all(&self) -> Result<HistoryLoadResult, String> {
        self.store.load_all()
    }

    pub fn clear(&self) -> Result<(), String> {
        self.store.clear()
    }

    pub fn remove(&self,
                  id: &str)
                  -> Result<(), String> {
        self.store.remove(id)
    }
}
