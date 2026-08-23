use std::collections::HashMap;

use serde::{
    Deserialize,
    Serialize,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedTable {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

/// 読み込み済みデータセットの全体。プレビュー表示のため全行をフロントへ送る。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedDataset {
    pub key: String,
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisTable {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisSection {
    pub title: String,
    pub table: AnalysisTable,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisResult {
    pub sections: Vec<AnalysisSection>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n_note: Option<String>,
}

/// 変数作成の指定。現在は逆転項目のみ。
/// `names` は `sources` と同じ並びの新しい列名。接尾辞と任意の名前のどちらで
/// 組み立てるかはフロント側の選択で、Rust は確定した名前だけを受け取る。
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VariableSpec {
    pub sources: Vec<String>,
    pub names: Vec<String>,
    pub scale_min: f64,
    pub scale_max: f64,
}

/// transform.R の出力。列名は入力キー (元の列名) のまま返る。
#[derive(Debug, Clone, Deserialize)]
pub struct TransformResult {
    pub columns: HashMap<String, Vec<String>>,
    pub note: Option<String>,
}

/// 変数作成の結果。note は数値化に失敗した値をユーザーへ通知する。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVariableResult {
    pub dataset: LoadedDataset,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryRecord {
    pub id: String,
    pub method: String,
    pub variables: Vec<String>,
    pub options: serde_json::Value,
    pub result: AnalysisResult,
    pub created_at: i64,
}
