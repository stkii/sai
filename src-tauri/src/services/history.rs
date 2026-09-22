use std::sync::Arc;

use crate::infra::store::history_store::HistoryStore;
use crate::models::{
    HISTORY_FORMAT_VERSION,
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

    /// 形式は保存する側が決めるので、呼び出し元が何を入れていても今の版で
    /// 上書きする。読めた版を書き戻して古い形式に見せかけない。
    pub fn append(&self,
                  mut record: HistoryRecord)
                  -> Result<(), String> {
        record.format_version = Some(HISTORY_FORMAT_VERSION);
        self.store.append(&record)
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{
        AnalysisResult,
        HISTORY_FORMAT_VERSION,
    };

    fn record(format_version: Option<u32>) -> HistoryRecord {
        HistoryRecord { format_version,
                        id: "1".to_string(),
                        method: "describe".to_string(),
                        variables: vec!["a".to_string()],
                        options: serde_json::json!({}),
                        result: AnalysisResult { sections: Vec::new(),
                                                 n: None,
                                                 n_note: None,
                                                 typed: None,
                                                 engine: None },
                        created_at: 0 }
    }

    fn service(dir: &tempfile::TempDir) -> HistoryService {
        HistoryService::new(Arc::new(HistoryStore::new(dir.path().join("history.jsonl"))))
    }

    #[test]
    fn stamps_the_format_of_the_line_it_writes() {
        let dir = tempfile::tempdir().unwrap();
        let service = service(&dir);

        service.append(record(None)).unwrap();

        let stored = &service.load_all().unwrap().records[0];
        assert_eq!(stored.format_version, Some(HISTORY_FORMAT_VERSION));
    }

    #[test]
    fn does_not_keep_a_format_the_caller_claimed() {
        let dir = tempfile::tempdir().unwrap();
        let service = service(&dir);

        service.append(record(Some(1))).unwrap();

        let stored = &service.load_all().unwrap().records[0];
        assert_eq!(stored.format_version, Some(HISTORY_FORMAT_VERSION));
    }
}
