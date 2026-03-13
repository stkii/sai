use indexmap::IndexMap;
use serde::Serialize;

/// Dataset where every cell is stored as an optional string.
/// Suitable for analyses that mix numeric and categorical variables (e.g., ANOVA).
/// R receives the raw strings and handles type conversion (e.g., as.factor()).
pub(crate) type StringMixedDataset = IndexMap<String, Vec<Option<String>>>;

#[derive(Clone, Debug, Serialize)]
pub(crate) struct StringMixedDatasetEntry {
    #[serde(flatten)]
    pub dataset: StringMixedDataset,
    #[serde(skip)]
    pub path: String,
    #[serde(skip)]
    pub sheet: String,
    #[serde(skip)]
    pub variables: Vec<String>,
}
