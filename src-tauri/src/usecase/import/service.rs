use super::ports::{
    LoadedNumericDataset,
    TableReader,
};

use crate::domain::input::source_kind::DataSourceKind;
use crate::domain::input::table::ParsedDataTable;

pub(crate) struct ImportService<R: TableReader> {
    reader: R,
}

impl<R: TableReader> ImportService<R> {
    pub(crate) fn new(reader: R) -> Self {
        Self { reader }
    }

    pub(crate) fn build_numeric_dataset(&self,
                                        path: &str,
                                        sheet: Option<&str>,
                                        variables: &[String])
                                        -> Result<LoadedNumericDataset, String> {
        let kind = DataSourceKind::from_path(path)?;
        self.reader.build_numeric_dataset(kind, path, sheet, variables)
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
}
