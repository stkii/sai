use serde_json::Value;
use std::path::Path;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum DataSourceKind {
    Csv,
    Excel,
}

impl DataSourceKind {
    pub fn from_path(path: &str) -> Result<Self, String> {
        let ext = Path::new(path).extension()
                                 .and_then(|value| value.to_str())
                                 .map(|value| value.to_ascii_lowercase());
        match ext.as_deref() {
            Some("csv") => Ok(DataSourceKind::Csv),
            Some("xlsx") | Some("xls") => Ok(DataSourceKind::Excel),
            Some(other) => Err(format!("Unsupported file type: .{}", other)),
            None => Err("Unsupported file type: missing extension".to_string()),
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            DataSourceKind::Csv => "csv",
            DataSourceKind::Excel => "excel",
        }
    }
}

#[derive(Clone, Debug)]
pub(crate) struct NormalizedRows {
    pub rows: Vec<Vec<Value>>,
    pub note: Option<String>,
}
