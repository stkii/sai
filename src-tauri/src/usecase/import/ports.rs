use crate::domain::input::numeric::{
    NumericDataset,
    NumericDatasetEntry,
};
use crate::domain::input::source_kind::DataSourceKind;
use crate::domain::input::table::ParsedDataTable;

#[derive(Clone, Debug)]
pub(crate) struct LoadedNumericDataset {
    pub dataset: NumericDataset,
    pub sheet_name: String,
}

pub(crate) trait TableReader: Send + Sync {
    fn read_sheets(&self,
                   kind: DataSourceKind,
                   path: &str)
                   -> Result<Vec<String>, String>;

    fn read_table(&self,
                  kind: DataSourceKind,
                  path: &str,
                  sheet: Option<&str>)
                  -> Result<ParsedDataTable, String>;

    fn build_numeric_dataset(&self,
                             kind: DataSourceKind,
                             path: &str,
                             sheet: Option<&str>,
                             variables: &[String])
                             -> Result<LoadedNumericDataset, String>;
}

pub(crate) trait NumericDatasetCacheStore: Send + Sync {
    fn insert_numeric_dataset(&self,
                              entry: NumericDatasetEntry)
                              -> Result<String, String>;

    fn clear_numeric_dataset_cache(&self) -> Result<(), String>;
}
