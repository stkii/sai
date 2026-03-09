use std::sync::Arc;

use crate::domain::input::numeric::NumericDatasetEntry;
use crate::usecase::analysis::ports::DatasetCacheStore;
use crate::usecase::import::ports::NumericDatasetCacheStore;

use super::dataset_cache;

#[derive(Clone, Copy, Default)]
pub(crate) struct DatasetCacheRepository;

impl DatasetCacheStore for DatasetCacheRepository {
    fn get_numeric_dataset(&self,
                           dataset_cache_id: &str)
                           -> Result<Option<Arc<NumericDatasetEntry>>, String> {
        dataset_cache::get_numeric_dataset(dataset_cache_id)
    }
}

impl NumericDatasetCacheStore for DatasetCacheRepository {
    fn insert_numeric_dataset(&self,
                              entry: NumericDatasetEntry)
                              -> Result<String, String> {
        dataset_cache::insert_numeric_dataset(entry)
    }

    fn clear_numeric_dataset_cache(&self) -> Result<(), String> {
        dataset_cache::clear_numeric_dataset_cache()
    }
}
