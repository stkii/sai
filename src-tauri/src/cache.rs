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
use std::time::{
    Duration,
    Instant,
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

#[derive(Clone)]
struct CachedEntry {
    entry: Arc<NumericDatasetEntry>,
    last_accessed_at: Instant,
    access_tick: u64,
}

const MAX_DATASET_CACHE_ENTRIES: usize = 32;
const DATASET_CACHE_TTL: Duration = Duration::from_secs(30 * 60);

static DATASET_CACHE: OnceLock<Mutex<HashMap<String, CachedEntry>>> = OnceLock::new();
static DATASET_COUNTER: AtomicU64 = AtomicU64::new(1);
static DATASET_ACCESS_COUNTER: AtomicU64 = AtomicU64::new(1);

fn dataset_cache() -> &'static Mutex<HashMap<String, CachedEntry>> {
    DATASET_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

pub fn insert_numeric_dataset(entry: NumericDatasetEntry) -> Result<String, String> {
    let id = DATASET_COUNTER.fetch_add(1, Ordering::Relaxed);
    let dataset_cache_id = format!("ds_{}", id);
    let now = Instant::now();
    let access_tick = DATASET_ACCESS_COUNTER.fetch_add(1, Ordering::Relaxed);

    let mut cache = dataset_cache().lock()
                                   .map_err(|_| "Dataset cache lock poisoned".to_string())?;
    prune_expired_entries(&mut cache, now);

    cache.insert(dataset_cache_id.clone(),
                 CachedEntry { entry: Arc::new(entry),
                               last_accessed_at: now,
                               access_tick });
    evict_lru_if_needed(&mut cache);

    Ok(dataset_cache_id)
}

pub fn get_numeric_dataset(dataset_cache_id: &str) -> Result<Option<Arc<NumericDatasetEntry>>, String> {
    let now = Instant::now();
    let access_tick = DATASET_ACCESS_COUNTER.fetch_add(1, Ordering::Relaxed);
    let mut cache = dataset_cache().lock()
                                   .map_err(|_| "Dataset cache lock poisoned".to_string())?;
    prune_expired_entries(&mut cache, now);
    if let Some(cached) = cache.get_mut(dataset_cache_id) {
        cached.last_accessed_at = now;
        cached.access_tick = access_tick;
        return Ok(Some(cached.entry.clone()));
    }
    Ok(None)
}

pub fn clear_numeric_dataset_cache() -> Result<(), String> {
    let mut cache = dataset_cache().lock()
                                   .map_err(|_| "Dataset cache lock poisoned".to_string())?;
    cache.clear();
    Ok(())
}

fn prune_expired_entries(cache: &mut HashMap<String, CachedEntry>,
                         now: Instant) {
    cache.retain(|_, cached| now.duration_since(cached.last_accessed_at) <= DATASET_CACHE_TTL);
}

fn evict_lru_if_needed(cache: &mut HashMap<String, CachedEntry>) {
    while cache.len() > MAX_DATASET_CACHE_ENTRIES {
        let lru_key = cache.iter()
                           .min_by_key(|(_, cached)| cached.access_tick)
                           .map(|(key, _)| key.clone());
        let Some(lru_key) = lru_key else {
            break;
        };
        cache.remove(&lru_key);
    }
}
