use indexmap::IndexMap;

pub(crate) type NumericDataset = IndexMap<String, Vec<Option<f64>>>;

#[derive(Clone, Debug)]
pub(crate) struct NumericDatasetEntry {
    pub dataset: NumericDataset,
    pub path: String,
    pub sheet: String,
    pub variables: Vec<String>,
}

#[derive(Clone, Copy)]
pub(crate) struct NumericCellContext<'a> {
    row_index: usize,
    col_index: usize,
    header: &'a str,
}

impl<'a> NumericCellContext<'a> {
    pub(crate) fn new(row_index: usize,
                      col_index: usize,
                      header: &'a str)
                      -> Self {
        Self { row_index,
               col_index,
               header }
    }

    pub(crate) fn error(&self,
                        reason: &str)
                        -> String {
        let row_no = self.row_index + 2;
        let col_no = self.col_index + 1;
        format!("Numeric dataset validation error at row {} col {} ({}): {}",
                row_no, col_no, self.header, reason)
    }
}

pub(crate) fn parse_numeric_string(value: &str,
                                   context: NumericCellContext<'_>)
                                   -> Result<Option<f64>, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    match trimmed.parse::<f64>() {
        Ok(number) => parse_finite_number(number, context),
        Err(_) => Err(context.error("value is not numeric")),
    }
}

pub(crate) fn parse_finite_number(value: f64,
                                  context: NumericCellContext<'_>)
                                  -> Result<Option<f64>, String> {
    if value.is_finite() {
        Ok(Some(value))
    } else {
        Err(context.error("value is not finite"))
    }
}
