use serde::{
    Deserialize,
    Serialize,
};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ParsedDataTable {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

impl ParsedDataTable {
    pub fn validate(&self) -> Result<(), String> {
        let w = self.headers.len();
        for (i, row) in self.rows.iter().enumerate() {
            if row.len() != w {
                return Err(format!("ParsedDataTable validation error: row {} length {} != headers {}",
                                   i,
                                   row.len(),
                                   w));
            }
            for (j, cell) in row.iter().enumerate() {
                match cell {
                    serde_json::Value::Null
                    | serde_json::Value::Bool(_)
                    | serde_json::Value::Number(_)
                    | serde_json::Value::String(_) => {},
                    _ => {
                        return Err(format!("ParsedDataTable validation error: rows[{}][{}] has unsupported type",
                                           i, j));
                    },
                }
            }
        }
        Ok(())
    }
}
