use calamine::Data;

#[derive(Clone, Copy)]
pub struct NumericCellContext<'a> {
    row_index: usize,
    col_index: usize,
    header: &'a str,
}

impl<'a> NumericCellContext<'a> {
    pub fn new(row_index: usize,
               col_index: usize,
               header: &'a str)
               -> Self {
        Self { row_index,
               col_index,
               header }
    }

    fn error(&self,
             reason: &str)
             -> String {
        let row_no = self.row_index + 2;
        let col_no = self.col_index + 1;
        format!("Numeric dataset validation error at row {} col {} ({}): {}",
                row_no, col_no, self.header, reason)
    }
}

pub fn parse_csv_numeric_cell(cell: Option<&str>,
                              context: NumericCellContext<'_>)
                              -> Result<Option<f64>, String> {
    let Some(raw) = cell else {
        return Ok(None);
    };
    parse_numeric_string(raw, context)
}

pub fn parse_xlsx_numeric_cell(cell: Option<&Data>,
                               context: NumericCellContext<'_>)
                               -> Result<Option<f64>, String> {
    match cell {
        None => Ok(None),
        Some(Data::Empty) => Ok(None),
        Some(Data::String(value)) => parse_numeric_string(value, context),
        Some(Data::Float(value)) => parse_finite_number(*value, context),
        #[allow(deprecated)]
        Some(Data::Int(value)) => Ok(Some(*value as f64)),
        Some(Data::Bool(_)) => Err(context.error("boolean value is not allowed")),
        Some(Data::DateTime(_)) | Some(Data::DateTimeIso(_)) | Some(Data::DurationIso(_)) => {
            Err(context.error("datetime value is not allowed"))
        },
        Some(Data::Error(_)) => Err(context.error("cell has an Excel error")),
    }
}

fn parse_numeric_string(value: &str,
                        context: NumericCellContext<'_>)
                        -> Result<Option<f64>, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    match trimmed.parse::<f64>() {
        Ok(value) => parse_finite_number(value, context),
        Err(_) => Err(context.error("value is not numeric")),
    }
}

fn parse_finite_number(value: f64,
                       context: NumericCellContext<'_>)
                       -> Result<Option<f64>, String> {
    if value.is_finite() {
        Ok(Some(value))
    } else {
        Err(context.error("value is not finite"))
    }
}
