use super::types::DataSourceKind;
use super::{
    csv,
    excel,
};
use crate::cache::NumericDataset;
use crate::dto::ParsedDataTable;

pub struct LoadedNumericDataset {
    pub dataset: NumericDataset,
    pub sheet_name: String,
}

pub fn get_sheets(kind: DataSourceKind,
                  path: &str)
                  -> Result<Vec<String>, String> {
    match kind {
        DataSourceKind::Csv => Ok(vec![]),
        DataSourceKind::Excel => excel::get_excel_sheets(path),
    }
}

pub fn parse_table(kind: DataSourceKind,
                   path: &str,
                   sheet: Option<&str>)
                   -> Result<ParsedDataTable, String> {
    let table = match kind {
        DataSourceKind::Csv => csv::parse_csv_table(path)?,
        DataSourceKind::Excel => {
            let sheet = required_excel_sheet(sheet)?;
            let rows = excel::read_excel_sheet_rows(path, sheet)?;
            excel::create_parsed_data_table(rows)?
        },
    };
    table.validate()?;
    Ok(table)
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
        DataSourceKind::Excel => {
            let sheet = required_excel_sheet(sheet)?;
            let rows = excel::read_excel_sheet_rows(path, sheet)?;
            let dataset = excel::build_numeric_dataset(rows, variables)?;
            Ok(LoadedNumericDataset { dataset,
                                      sheet_name: sheet.to_string() })
        },
    }
}

pub fn get_excel_sheets(path: &str) -> Result<Vec<String>, String> {
    ensure_excel_source(path)?;
    excel::get_excel_sheets(path)
}

pub fn parse_excel_table(path: &str,
                         sheet: &str)
                         -> Result<ParsedDataTable, String> {
    ensure_excel_source(path)?;
    parse_table(DataSourceKind::Excel, path, Some(sheet))
}

fn required_excel_sheet(sheet: Option<&str>) -> Result<&str, String> {
    sheet.ok_or_else(|| "Sheet is required for Excel file".to_string())
}

fn ensure_excel_source(path: &str) -> Result<(), String> {
    match DataSourceKind::from_path(path)? {
        DataSourceKind::Excel => Ok(()),
        DataSourceKind::Csv => Err("Excel file is required".to_string()),
    }
}
