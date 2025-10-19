use serde::{
    Deserialize,
    Serialize,
};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ParsedTable {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
}
