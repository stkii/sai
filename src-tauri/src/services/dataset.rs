use std::collections::{
    HashMap,
    HashSet,
};
use std::path::Path;
use std::sync::Arc;

use uuid::Uuid;

use crate::infra::cache::dataset_cache::DatasetCache;
use crate::infra::r::transformer::Transformer;
use crate::infra::reader::spss::SavReader;
use crate::infra::reader::{
    csv as csv_reader,
    excel as excel_reader,
};
use crate::models::{
    CreateVariableResult,
    LoadedDataset,
    ParsedTable,
    VariableSpec,
};

/// 対応ファイル形式の判定はここが唯一の真実。
/// フロントは拡張子を解釈せず、`get_sheets` が空を返すか否かでシート選択の要否を判断する。
#[derive(Debug)]
enum FileKind {
    Csv,
    Excel,
    Sav,
}

impl FileKind {
    fn from_path(path: &Path) -> Result<Self, String> {
        let ext = path.extension()
                      .and_then(|e| e.to_str())
                      .map(|s| s.to_lowercase());
        match ext.as_deref() {
            Some("csv") => Ok(Self::Csv),
            Some("xlsx") | Some("xls") => Ok(Self::Excel),
            Some("sav") => Ok(Self::Sav),
            Some(ext) => Err(format!("未対応のファイル形式です: .{ext} (対応: .csv .xlsx .xls .sav)")),
            None => Err("拡張子がないためファイル形式を判別できません".to_string()),
        }
    }
}

pub struct DatasetService {
    cache: Arc<DatasetCache>,
    sav_reader: SavReader,
    transformer: Transformer,
}

impl DatasetService {
    pub fn new(cache: Arc<DatasetCache>,
               sav_reader: SavReader,
               transformer: Transformer)
               -> Self {
        Self { cache,
               sav_reader,
               transformer }
    }

    pub fn get_sheets(&self,
                      path: &Path)
                      -> Result<Vec<String>, String> {
        match FileKind::from_path(path)? {
            // CSV / SAV にシート概念はない。空リストが「シート選択不要」の合図
            FileKind::Csv | FileKind::Sav => Ok(Vec::new()),
            FileKind::Excel => excel_reader::get_sheet_names(path),
        }
    }

    pub fn load(&self,
                path: &Path,
                sheet: Option<String>)
                -> Result<LoadedDataset, String> {
        let table = self.read(path, sheet)?;
        validate_headers(&table.headers)?;
        let key = Uuid::new_v4().to_string();
        let dataset = LoadedDataset { key: key.clone(),
                                      headers: table.headers.clone(),
                                      rows: table.rows.clone() };
        // フロントは単一データセット前提のため、新規ロード時に旧エントリを破棄する
        self.cache.clear();
        self.cache.insert(key, table);
        Ok(dataset)
    }

    /// 逆転項目の派生列を追加し、更新後のデータセットを返す。
    /// キャッシュは同じ key で上書きするため、分析側の配線には影響しない。
    pub fn create_variable(&self,
                           key: &str,
                           spec: &VariableSpec)
                           -> Result<CreateVariableResult, String> {
        if spec.sources.is_empty() {
            return Err("逆転する項目が選択されていません".into());
        }
        if spec.names.len() != spec.sources.len() {
            return Err("項目と新しい変数名の数が一致しません".into());
        }
        if spec.names.iter().any(|n| n.trim().is_empty()) {
            return Err("新しい変数名を入力してください".into());
        }
        if spec.scale_min >= spec.scale_max {
            return Err("尺度の最小値は最大値より小さい必要があります".into());
        }

        let table = self.cache
                        .get(key)
                        .ok_or_else(|| "データセットが見つかりません (キャッシュ切れ)".to_string())?;

        let indices: Vec<usize> = spec.sources
                                      .iter()
                                      .map(|v| {
                                          table.headers
                                               .iter()
                                               .position(|h| h == v)
                                               .ok_or_else(|| format!("変数 '{v}' が見つかりません"))
                                      })
                                      .collect::<Result<_, _>>()?;

        let new_names = &spec.names;
        validate_new_headers(&table.headers, new_names)?;

        let columns: HashMap<String, Vec<String>> =
            spec.sources
                .iter()
                .zip(indices.iter())
                .map(|(name, &i)| (name.clone(), table.rows.iter().map(|r| r[i].clone()).collect()))
                .collect();

        // 範囲外の値があれば R がエラーを返す。キャッシュはここまで触らないため、
        // 失敗しても列が中途半端に増えた状態にはならない
        let transformed = self.transformer
                              .reverse(&columns, spec.scale_min, spec.scale_max)?;

        let mut headers = table.headers.clone();
        let mut rows = table.rows.clone();
        for (source, new_name) in spec.sources.iter().zip(new_names.iter()) {
            let values = transformed.columns
                                    .get(source)
                                    .ok_or_else(|| format!("変換結果に列 '{source}' がありません"))?;
            if values.len() != rows.len() {
                return Err(format!("変換結果の行数が元データと一致しません: {new_name}"));
            }
            for (row, v) in rows.iter_mut().zip(values.iter()) {
                row.push(v.clone());
            }
            headers.push(new_name.clone());
        }

        self.cache.insert(key.to_string(),
                          ParsedTable { headers: headers.clone(),
                                        rows: rows.clone() });

        Ok(CreateVariableResult { dataset: LoadedDataset { key: key.to_string(),
                                                           headers,
                                                           rows },
                                  note: transformed.note })
    }

    fn read(&self,
            path: &Path,
            sheet: Option<String>)
            -> Result<ParsedTable, String> {
        match FileKind::from_path(path)? {
            FileKind::Csv => csv_reader::read_csv(path),
            FileKind::Excel => {
                let sheet_name = sheet.ok_or_else(|| "Excel ファイルにはシート名が必要です".to_string())?;
                excel_reader::read_excel(path, &sheet_name)
            },
            FileKind::Sav => self.sav_reader.read(path),
        }
    }
}

/// 空・重複した列名は fail-fast で拒否する。
/// 列の射影が名前の先頭一致で行われるため、重複を許すと選択した列と
/// 異なる列が silent に分析される (ダークパターン禁止規約)。
fn validate_headers(headers: &[String]) -> Result<(), String> {
    let empty_cols: Vec<String> = headers.iter()
                                         .enumerate()
                                         .filter(|(_, h)| h.trim().is_empty())
                                         .map(|(i, _)| format!("{} 列目", i + 1))
                                         .collect();
    if !empty_cols.is_empty() {
        return Err(format!("列名が空の列があります ({})。全ての列に名前を付けてください",
                           empty_cols.join(", ")));
    }

    let mut seen = HashSet::new();
    let mut dups: Vec<&str> = Vec::new();
    for h in headers {
        if !seen.insert(h.as_str()) && !dups.contains(&h.as_str()) {
            dups.push(h);
        }
    }
    if !dups.is_empty() {
        return Err(format!("列名が重複しています: {}。列の取り違えを防ぐため、一意な名前に変更してください",
                           dups.join(", ")));
    }
    Ok(())
}

/// 追加する列名を検証する。既存列との衝突と新規同士の重複を拒否する。
/// 元データの列名は読込時に検証済みなので、ここでは追加分だけを見る。
fn validate_new_headers(existing: &[String],
                        new_names: &[String])
                        -> Result<(), String> {
    let existing_set: HashSet<&str> = existing.iter().map(String::as_str).collect();
    let mut seen: HashSet<&str> = HashSet::new();
    for name in new_names {
        if existing_set.contains(name.as_str()) {
            return Err(format!("列名 '{name}' はすでに存在します。別の名前を指定してください"));
        }
        if !seen.insert(name.as_str()) {
            return Err(format!("追加する列名 '{name}' が重複しています"));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::{
        FileKind,
        validate_headers,
        validate_new_headers,
    };

    fn headers(names: &[&str]) -> Vec<String> {
        names.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn unsupported_extension_is_reported_readably() {
        let err = FileKind::from_path(Path::new("/tmp/data.txt")).unwrap_err();
        assert!(err.contains(".txt"), "拡張子をそのまま示す: {err}");
        assert!(!err.contains("Some("), "Rust のデバッグ表記を漏らさない: {err}");

        let err = FileKind::from_path(Path::new("/tmp/data")).unwrap_err();
        assert!(err.contains("拡張子がない"), "{err}");
    }

    #[test]
    fn accepts_unique_headers() {
        assert!(validate_headers(&headers(&["a", "b", "c"])).is_ok());
    }

    #[test]
    fn rejects_duplicate_headers() {
        let err = validate_headers(&headers(&["score", "age", "score"])).unwrap_err();
        assert!(err.contains("score"), "エラーに重複列名を含む: {err}");
    }

    #[test]
    fn rejects_empty_headers() {
        let err = validate_headers(&headers(&["a", " ", "c"])).unwrap_err();
        assert!(err.contains("2 列目"), "エラーに列位置を含む: {err}");
    }

    #[test]
    fn reports_each_duplicate_once() {
        let err = validate_headers(&headers(&["x", "x", "x", "y", "y"])).unwrap_err();
        assert_eq!(err.matches('x').count(), 1);
        assert_eq!(err.matches('y').count(), 1);
    }

    #[test]
    fn accepts_fresh_derived_names() {
        assert!(validate_new_headers(&headers(&["q1", "q2"]), &headers(&["q1_R", "q2_R"])).is_ok());
    }

    #[test]
    fn rejects_derived_name_colliding_with_existing() {
        let err = validate_new_headers(&headers(&["q1", "q1_R"]), &headers(&["q1_R"])).unwrap_err();
        assert!(err.contains("q1_R"), "エラーに衝突した列名を含む: {err}");
        assert!(err.contains("すでに存在"), "既存との衝突だと分かる: {err}");
    }

    #[test]
    fn rejects_duplicate_derived_names() {
        let err = validate_new_headers(&headers(&["q1"]), &headers(&["q1_R", "q1_R"])).unwrap_err();
        assert!(err.contains("重複"), "新規同士の重複を拒否する: {err}");
    }
}
