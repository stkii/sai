use super::utils::DataSourceKind;
use super::{
    csv,
    xlsx,
};

use crate::dto::{
    NumericDataset,
    ParsedDataTable,
};

struct LoadedNumericDataset {
    pub dataset: NumericDataset,
    pub sheet_name: String,
}

pub fn build_numeric_dataset(kind: DataSourceKind,
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

pub fn get_sheets(kind: DataSourceKind,
                  path: &str)
                  -> Result<Vec<String>, String> {
    match kind {
        DataSourceKind::Csv => Ok(vec![]),
        DataSourceKind::Xlsx => xlsx::get_xlsx_sheets(path),
    }
}

pub fn get_xlsx_sheets(path: &str) -> Result<Vec<String>, String> {
    ensure_xlsx_source(path)?;
    xlsx::get_xlsx_sheets(path)
}

pub fn parse_table(kind: DataSourceKind,
                   path: &str,
                   sheet: Option<&str>)
                   -> Result<ParsedDataTable, String> {
    let table = match kind {
        DataSourceKind::Csv => csv::parse_csv_table(path)?,
        DataSourceKind::Xlsx => {
            let sheet = required_xlsx_sheet(sheet)?;
            let rows = xlsx::read_xlsx_sheet_rows(path, sheet)?;
            xlsx::create_parsed_data_table(rows)?
        },
    };
    table.validate()?;
    Ok(table)
}

fn ensure_xlsx_source(path: &str) -> Result<(), String> {
    match DataSourceKind::from_path(path)? {
        DataSourceKind::Xlsx => Ok(()),
        DataSourceKind::Csv => Err("XLSX file is required".to_string()),
    }
}

fn required_xlsx_sheet(sheet: Option<&str>) -> Result<&str, String> {
    sheet.ok_or_else(|| "Sheet is required for XLSX file".to_string())
}
