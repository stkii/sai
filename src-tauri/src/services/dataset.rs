use std::collections::HashSet;
use std::path::Path;
use std::sync::Arc;

use uuid::Uuid;

use crate::infra::cache::dataset_cache::DatasetCache;
use crate::infra::reader::spss::SavReader;
use crate::infra::reader::{
    csv as csv_reader,
    excel as excel_reader,
};
use crate::models::{
    LoadedDataset,
    ParsedTable,
};

/// 対応ファイル形式の判定はここが唯一の真実。
/// フロントは拡張子を解釈せず、`get_sheets` が空を返すか否かでシート選択の要否を判断する。
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
            other => Err(format!("未対応のファイル形式: {other:?}")),
        }
    }
}

pub struct DatasetService {
    cache: Arc<DatasetCache>,
    sav_reader: SavReader,
}

impl DatasetService {
    pub fn new(cache: Arc<DatasetCache>,
               sav_reader: SavReader)
               -> Self {
        Self { cache, sav_reader }
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

#[cfg(test)]
mod tests {
    use super::validate_headers;

    fn headers(names: &[&str]) -> Vec<String> {
        names.iter().map(|s| s.to_string()).collect()
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
}
