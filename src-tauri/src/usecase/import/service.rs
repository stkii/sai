use super::ports::{
    LoadedNumericDataset,
    LoadedStringMixedDataset,
    NumericDatasetCacheStore,
    TableReader,
};

use crate::domain::input::numeric::NumericDatasetEntry;
use crate::domain::input::source_kind::DataSourceKind;
use crate::domain::input::string_mixed::StringMixedDatasetEntry;
use crate::domain::input::table::ParsedDataTable;

pub(crate) struct BuiltNumericDataset {
    pub dataset_cache_id: String,
    pub sheet_name: String,
    pub variable_count: usize,
    pub row_count: usize,
}

pub(crate) struct BuiltStringMixedDataset {
    pub dataset_cache_id: String,
    pub sheet_name: String,
    pub variable_count: usize,
    pub row_count: usize,
}

pub(crate) struct ImportService<R: TableReader, C: NumericDatasetCacheStore> {
    reader: R,
    cache: C,
}

impl<R: TableReader, C: NumericDatasetCacheStore> ImportService<R, C> {
    pub(crate) fn new(reader: R,
                      cache: C)
                      -> Self {
        Self { reader, cache }
    }

    pub(crate) fn build_numeric_dataset(&self,
                                        path: &str,
                                        sheet: Option<&str>,
                                        variables: &[String])
                                        -> Result<BuiltNumericDataset, String> {
        let kind = DataSourceKind::from_path(path)?;
        let loaded = self.reader.build_numeric_dataset(kind, path, sheet, variables)?;
        self.cache_loaded_numeric_dataset(path, loaded)
    }

    pub(crate) fn get_sheets(&self,
                             path: &str)
                             -> Result<Vec<String>, String> {
        let kind = DataSourceKind::from_path(path)?;
        self.reader.read_sheets(kind, path)
    }

    pub(crate) fn parse_table(&self,
                              path: &str,
                              sheet: Option<&str>)
                              -> Result<ParsedDataTable, String> {
        let kind = DataSourceKind::from_path(path)?;
        let table = self.reader.read_table(kind, path, sheet)?;
        table.validate()?;
        Ok(table)
    }

    pub(crate) fn clear_numeric_dataset_cache(&self) -> Result<(), String> {
        self.cache.clear_numeric_dataset_cache()
    }

    pub(crate) fn build_string_mixed_dataset(&self,
                                              path: &str,
                                              sheet: Option<&str>,
                                              variables: &[String])
                                              -> Result<BuiltStringMixedDataset, String> {
        let kind = DataSourceKind::from_path(path)?;
        let loaded = self.reader.build_string_mixed_dataset(kind, path, sheet, variables)?;
        self.cache_loaded_string_mixed_dataset(path, loaded)
    }

    fn cache_loaded_numeric_dataset(&self,
                                    path: &str,
                                    loaded: LoadedNumericDataset)
                                    -> Result<BuiltNumericDataset, String> {
        let row_count = loaded.dataset.values().next().map(|col| col.len()).unwrap_or(0);
        let variable_count = loaded.dataset.len();
        let variables_in_order: Vec<String> = loaded.dataset.keys().cloned().collect();
        let sheet_name = loaded.sheet_name;
        let dataset_cache_id =
            self.cache
                .insert_numeric_dataset(NumericDatasetEntry { dataset: loaded.dataset,
                                                              path: path.to_string(),
                                                              sheet: sheet_name.clone(),
                                                              variables: variables_in_order })?;
        Ok(BuiltNumericDataset { dataset_cache_id,
                                 sheet_name,
                                 variable_count,
                                 row_count })
    }

    fn cache_loaded_string_mixed_dataset(&self,
                                         path: &str,
                                         loaded: LoadedStringMixedDataset)
                                         -> Result<BuiltStringMixedDataset, String> {
        let row_count = loaded.dataset.values().next().map(|col| col.len()).unwrap_or(0);
        let variable_count = loaded.dataset.len();
        let variables_in_order: Vec<String> = loaded.dataset.keys().cloned().collect();
        let sheet_name = loaded.sheet_name;
        let dataset_cache_id =
            self.cache
                .insert_string_mixed_dataset(StringMixedDatasetEntry { dataset: loaded.dataset,
                                                                       path: path.to_string(),
                                                                       sheet: sheet_name.clone(),
                                                                       variables: variables_in_order })?;
        Ok(BuiltStringMixedDataset { dataset_cache_id,
                                     sheet_name,
                                     variable_count,
                                     row_count })
    }
}
