use std::collections::HashMap;
use std::sync::{
    Arc,
    Mutex,
};

use crate::models::ParsedTable;

// 値を Arc で持ち、get はポインタのクローンだけを返す。
// 分析のたびに全行を深いコピーしないため。
pub struct DatasetCache {
    inner: Mutex<HashMap<String, Arc<ParsedTable>>>,
}

impl DatasetCache {
    pub fn new() -> Self {
        Self { inner: Mutex::new(HashMap::new()) }
    }

    pub fn insert(&self,
                  key: String,
                  table: ParsedTable) {
        self.inner.lock().unwrap().insert(key, Arc::new(table));
    }

    pub fn get(&self,
               key: &str)
               -> Option<Arc<ParsedTable>> {
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
