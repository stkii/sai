use rust_xlsxwriter::{
    Workbook,
    Worksheet,
    XlsxError,
};
use serde::Deserialize;
use serde_json::Value;

use crate::dto::ParsedDataTable;

const DEFAULT_SHEET_NAME: &str = "Results";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisExportSection {
    pub section_title: Option<String>,
    pub table: ParsedDataTable,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisExportLog {
    pub label: String,
    pub timestamp: String,
    pub sections: Vec<AnalysisExportSection>,
}

#[tauri::command]
pub fn export_analysis_to_xlsx(path: String,
                               logs: Vec<AnalysisExportLog>)
                               -> Result<(), String> {
    if path.trim().is_empty() {
        return Err("Export path is empty".to_string());
    }
    if logs.is_empty() {
        return Err("No analysis logs to export".to_string());
    }

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    worksheet.set_name(DEFAULT_SHEET_NAME)
             .map_err(|e| format!("Failed to set sheet name: {}", e))?;

    let mut row = 0_u32;
    for log in logs.iter() {
        row = write_log(worksheet, row, log).map_err(|e| format!("Failed to write log: {}", e))?;
    }

    workbook.save(path)
            .map_err(|e| format!("Failed to save Excel file: {}", e))?;
    Ok(())
}

fn write_log(worksheet: &mut Worksheet,
             start_row: u32,
             log: &AnalysisExportLog)
             -> Result<u32, XlsxError> {
    let header = format!("{} {}", log.label, log.timestamp);
    worksheet.write_string(start_row, 0, &header)?;
    let mut row = start_row + 1;

    for (index, section) in log.sections.iter().enumerate() {
        row = write_section(worksheet, row, section)?;
        if index + 1 < log.sections.len() {
            row += 1;
        }
    }

    Ok(row + 1)
}

fn write_section(worksheet: &mut Worksheet,
                 start_row: u32,
                 section: &AnalysisExportSection)
                 -> Result<u32, XlsxError> {
    let mut row = start_row;
    if let Some(title) = section.section_title
                                .as_ref()
                                .map(|value| value.trim())
                                .filter(|value| !value.is_empty())
    {
        worksheet.write_string(row, 0, title)?;
        row += 1;
    }

    write_table_with_title(worksheet, row, &section.table)
}

fn write_table_with_title(worksheet: &mut Worksheet,
                          start_row: u32,
                          table: &ParsedDataTable)
                          -> Result<u32, XlsxError> {
    let mut row = start_row;
    if let Some(title) = table.title
                              .as_ref()
                              .map(|value| value.trim())
                              .filter(|value| !value.is_empty())
    {
        worksheet.write_string(row, 0, title)?;
        row += 1;
    }

    row = write_table(worksheet, row, table)?;

    if let Some(note) = table.note
                             .as_ref()
                             .map(|value| value.trim())
                             .filter(|value| !value.is_empty())
    {
        worksheet.write_string(row, 0, note)?;
        row += 1;
    }

    Ok(row)
}

fn write_table(worksheet: &mut Worksheet,
               start_row: u32,
               table: &ParsedDataTable)
               -> Result<u32, XlsxError> {
    let mut row = start_row;
    let star_columns = detect_star_columns(table);
    let column_count = table.headers.len();

    if !table.headers.is_empty() {
        let mut col_out = 0_u16;
        for (col, header) in table.headers.iter().enumerate() {
            worksheet.write_string(row, col_out, header)?;
            col_out += 1;
            if *star_columns.get(col).unwrap_or(&false) {
                worksheet.write_string(row, col_out, "")?;
                col_out += 1;
            }
        }
        row += 1;
    }

    for data_row in table.rows.iter() {
        let mut col_out = 0_u16;
        for col in 0..column_count {
            let has_star_column = *star_columns.get(col).unwrap_or(&false);
            let star_value = if let Some(cell) = data_row.get(col) {
                write_cell_with_star(worksheet, row, col_out, cell, has_star_column)?
            } else {
                None
            };
            col_out += 1;
            if has_star_column {
                if let Some(stars) = star_value {
                    worksheet.write_string(row, col_out, &stars)?;
                }
                col_out += 1;
            }
        }
        row += 1;
    }

    Ok(row)
}

fn write_cell_with_star(worksheet: &mut Worksheet,
                        row: u32,
                        col: u16,
                        cell: &Value,
                        has_star_column: bool)
                        -> Result<Option<String>, XlsxError> {
    if has_star_column {
        if let Value::String(value) = cell {
            if let Some((number, stars)) = split_star_value(value) {
                worksheet.write_number(row, col, number)?;
                return Ok(Some(stars));
            }
        }
    }

    write_cell(worksheet, row, col, cell)?;
    Ok(None)
}

fn write_cell(worksheet: &mut Worksheet,
              row: u32,
              col: u16,
              cell: &Value)
              -> Result<(), XlsxError> {
    match cell {
        Value::Null => Ok(()),
        Value::Bool(value) => {
            worksheet.write_boolean(row, col, *value)?;
            Ok(())
        },
        Value::Number(value) => {
            if let Some(number) = value.as_f64().filter(|number| number.is_finite()) {
                worksheet.write_number(row, col, number)?;
                Ok(())
            } else {
                worksheet.write_string(row, col, &value.to_string())?;
                Ok(())
            }
        },
        Value::String(value) => write_string_or_number(worksheet, row, col, value),
        _ => {
            worksheet.write_string(row, col, &cell.to_string())?;
            Ok(())
        },
    }
}

fn write_string_or_number(worksheet: &mut Worksheet,
                          row: u32,
                          col: u16,
                          value: &str)
                          -> Result<(), XlsxError> {
    let trimmed = value.trim();
    if let Ok(number) = trimmed.parse::<f64>() {
        if number.is_finite() {
            worksheet.write_number(row, col, number)?;
            return Ok(());
        }
    }
    worksheet.write_string(row, col, value)?;
    Ok(())
}

fn detect_star_columns(table: &ParsedDataTable) -> Vec<bool> {
    let mut star_columns = vec![false; table.headers.len()];
    for row in table.rows.iter() {
        for (col, cell) in row.iter().enumerate() {
            if star_columns.get(col) == Some(&true) {
                continue;
            }
            if let Value::String(value) = cell {
                if split_star_value(value).is_some() {
                    if let Some(entry) = star_columns.get_mut(col) {
                        *entry = true;
                    }
                }
            }
        }
    }
    star_columns
}

fn split_star_value(value: &str) -> Option<(f64, String)> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    let mut split_index = trimmed.len();
    for (idx, ch) in trimmed.char_indices().rev() {
        if ch == '*' {
            split_index = idx;
        } else {
            break;
        }
    }

    if split_index == trimmed.len() {
        return None;
    }

    let number_part = trimmed[..split_index].trim();
    let stars = &trimmed[split_index..];
    let number = number_part.parse::<f64>().ok()?;
    if !number.is_finite() {
        return None;
    }

    Some((number, stars.to_string()))
}
