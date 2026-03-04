use crate::domain::input::numeric::NumericDataset;
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
