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
    /// メソッド固有の表示が節を特定するための鍵。表示名 (`title`) と違い変わらない。
    /// 必要なメソッドだけが付けるため任意 (`id` を持たない履歴レコードも読める)。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub title: String,
    pub table: AnalysisTable,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisResult {
    /// 整形済みの表。C++ エンジンの経路では空で、代わりに `typed` を持つ。
    pub sections: Vec<AnalysisSection>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n: Option<usize>,
    // R の snake_case を受け取り、画面と履歴へは従来どおり camelCase で渡す。
    #[serde(alias = "n_note", skip_serializing_if = "Option::is_none")]
    pub n_note: Option<String>,
    /// 丸める前の値と診断。R の経路と、これが無かった頃の履歴には付かない。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub typed: Option<TypedResult>,
    /// 計算した実装。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub engine: Option<EngineIdentity>,
}

/// 結果を計算した実装。保存済みの結果を、いま同じ入力で得られる値と区別できる
/// ようにする。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EngineIdentity {
    pub name: String,
    /// 版を特定できない実行先では付かない。推測で埋めない。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
}

/// 手法ごとに形の違う型付き結果。どの手法のものかは `method` で判別する。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "method", rename_all = "camelCase")]
pub enum TypedResult {
    Describe(DescriptiveReport),
}

/// 頼んだ値が返らなかった理由。表示文は持たず、画面が code と target から組み立てる。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResultDiagnostic {
    pub code: String,
    /// 空のままだった結果のフィールド名。
    pub target: String,
    /// その統計量を求めるのに使えた有効件数。
    pub count: usize,
}

/// 記述統計の型付き結果。丸めは行わず、表の見出しと桁数は画面側が決める。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DescriptiveReport {
    pub columns: Vec<DescriptiveColumn>,
    pub applied_options: DescriptiveAppliedOptions,
}

/// エンジンが実際に適用した設定。要求した設定は履歴の `options` に残るので、
/// 両者を突き合わせれば何が効いたかが分かる。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DescriptiveAppliedOptions {
    pub sort: String,
    pub include_skewness: bool,
    pub include_kurtosis: bool,
}

/// 1変数ぶんの記述統計。`null` は「値がない」ことを表し、0 の代わりではない。
/// オプションで切った統計量を除き、`null` には必ず対応する診断が付く。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DescriptiveColumn {
    pub variable: String,
    pub total_count: usize,
    pub valid_count: usize,
    pub missing_count: usize,
    pub mean: Option<f64>,
    pub standard_deviation: Option<f64>,
    pub minimum: Option<f64>,
    pub median: Option<f64>,
    pub maximum: Option<f64>,
    pub skewness: Option<f64>,
    pub kurtosis: Option<f64>,
    pub diagnostics: Vec<ResultDiagnostic>,
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

/// いま書き出す履歴行の形式。型付き結果と実行エンジンが載るようになった版。
pub const HISTORY_FORMAT_VERSION: u32 = 2;

/// 履歴の読込結果。壊れて読めなかった行は捨てるほかないが、件数を返して
/// 「履歴が減った」ことをユーザーへ伝えられるようにする。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryLoadResult {
    pub records: Vec<HistoryRecord>,
    pub skipped: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryRecord {
    /// 保存した行の形式。付かないレコードは型付き結果より前に保存されたもので、
    /// 欠けている情報を推測で埋めない。書き込む側が付けるので読込では任意。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format_version: Option<u32>,
    pub id: String,
    pub method: String,
    pub variables: Vec<String>,
    pub options: serde_json::Value,
    pub result: AnalysisResult,
    pub created_at: i64,
}

#[cfg(test)]
mod tests {
    use super::AnalysisResult;

    #[test]
    fn r_notes_survive_frontend_and_history_roundtrip() {
        let result: AnalysisResult =
            serde_json::from_str(r#"{"sections":[],"n":2,"n_note":"1件の観測が除外されました"}"#).unwrap();
        let json = serde_json::to_value(&result).unwrap();
        assert_eq!(json["nNote"], "1件の観測が除外されました");
        assert!(json.get("n_note").is_none());
        let restored: AnalysisResult = serde_json::from_value(json).unwrap();
        assert_eq!(restored.n_note, result.n_note);
    }
}
