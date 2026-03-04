mod csv;
mod xlsx;

use crate::domain::input::source_kind::DataSourceKind;
use crate::domain::input::table::ParsedDataTable;
use crate::usecase::import::ports::{
    LoadedNumericDataset,
    TableReader,
};

#[derive(Clone, Copy, Default)]
pub(crate) struct DataResolver;

impl TableReader for DataResolver {
    fn read_sheets(&self,
                   kind: DataSourceKind,
                   path: &str)
                   -> Result<Vec<String>, String> {
        match kind {
            DataSourceKind::Csv => Ok(vec![]),
            DataSourceKind::Xlsx => xlsx::get_xlsx_sheets(path),
        }
    }

    fn read_table(&self,
                  kind: DataSourceKind,
                  path: &str,
                  sheet: Option<&str>)
                  -> Result<ParsedDataTable, String> {
        match kind {
            DataSourceKind::Csv => csv::parse_csv_table(path),
            DataSourceKind::Xlsx => {
                let sheet = required_xlsx_sheet(sheet)?;
                let rows = xlsx::read_xlsx_sheet_rows(path, sheet)?;
                xlsx::create_parsed_data_table(rows)
            },
        }
    }

    fn build_numeric_dataset(&self,
                             kind: DataSourceKind,
                             path: &str,
                             sheet: Option<&str>,
                             variables: &[String])
                             -> Result<LoadedNumericDataset, String> {
        match kind {
            DataSourceKind::Csv => {
                let dataset = csv::build_numeric_dataset_from_csv(path, variables)?;
                Ok(LoadedNumericDataset { dataset,
                                          sheet_name: "CSV".to_string() })
            },
            DataSourceKind::Xlsx => {
                let sheet = required_xlsx_sheet(sheet)?;
                let rows = xlsx::read_xlsx_sheet_rows(path, sheet)?;
                let dataset = xlsx::build_numeric_dataset_from_xlsx(rows, variables)?;
                Ok(LoadedNumericDataset { dataset,
                                          sheet_name: sheet.to_string() })
            },
        }
    }
}

fn required_xlsx_sheet(sheet: Option<&str>) -> Result<&str, String> {
    sheet.ok_or_else(|| "Sheet is required for XLSX file".to_string())
}
