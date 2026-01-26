use std::collections::HashMap;
use std::sync::atomic::{
    AtomicU64,
    Ordering,
};
use std::sync::{
    Arc,
    Mutex,
    OnceLock,
};

use indexmap::IndexMap;

pub type NumericDataset = IndexMap<String, Vec<Option<f64>>>;

#[derive(Clone, Debug)]
pub struct NumericDatasetEntry {
    pub dataset: NumericDataset,
    pub path: String,
    pub sheet: String,
    pub variables: Vec<String>,
}

static DATASET_CACHE: OnceLock<Mutex<HashMap<String, Arc<NumericDatasetEntry>>>> = OnceLock::new();
static DATASET_COUNTER: AtomicU64 = AtomicU64::new(1);

fn dataset_cache() -> &'static Mutex<HashMap<String, Arc<NumericDatasetEntry>>> {
    DATASET_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

pub fn insert_numeric_dataset(entry: NumericDatasetEntry) -> Result<String, String> {
    let id = DATASET_COUNTER.fetch_add(1, Ordering::Relaxed);
    let dataset_cache_id = format!("ds_{}", id);

    let mut cache = dataset_cache().lock()
                                   .map_err(|_| "Dataset cache lock poisoned".to_string())?;
    cache.insert(dataset_cache_id.clone(), Arc::new(entry));

    Ok(dataset_cache_id)
}

pub fn get_numeric_dataset(dataset_cache_id: &str) -> Result<Option<Arc<NumericDatasetEntry>>, String> {
    let cache = dataset_cache().lock()
                               .map_err(|_| "Dataset cache lock poisoned".to_string())?;
    Ok(cache.get(dataset_cache_id).cloned())
}
