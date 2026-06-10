use std::collections::HashMap;
use std::sync::Mutex;

use crate::models::ParsedTable;

pub struct DatasetCache {
    inner: Mutex<HashMap<String, ParsedTable>>,
}

impl DatasetCache {
    pub fn new() -> Self {
        Self { inner: Mutex::new(HashMap::new()) }
    }

    pub fn insert(&self,
                  key: String,
                  table: ParsedTable) {
        self.inner.lock().unwrap().insert(key, table);
    }

    pub fn get(&self,
               key: &str)
               -> Option<ParsedTable> {
        self.inner.lock().unwrap().get(key).cloned()
    }

    pub fn clear(&self) {
        self.inner.lock().unwrap().clear();
    }
}

impl Default for DatasetCache {
    fn default() -> Self {
        Self::new()
    }
}
