use std::path::Path;

use uuid::Uuid;

use std::sync::Arc;

use crate::infra::cache::dataset_cache::DatasetCache;
use crate::infra::reader::{
    csv as csv_reader,
    xlsx as xlsx_reader,
};
use crate::models::{
    DatasetSummary,
    ParsedTable,
};

pub struct DatasetService {
    cache: Arc<DatasetCache>,
}

impl DatasetService {
    pub fn new(cache: Arc<DatasetCache>) -> Self {
        Self { cache }
    }

    pub fn get_sheets(&self,
                      path: &Path)
                      -> Result<Vec<String>, String> {
        match file_ext(path).as_deref() {
            Some("csv") => Ok(vec![]),
            Some("xlsx") | Some("xls") => xlsx_reader::get_sheet_names(path),
            other => Err(format!("未対応のファイル形式: {other:?}")),
        }
    }

    pub fn load(&self,
                path: &Path,
                sheet: Option<String>)
                -> Result<DatasetSummary, String> {
        let table = self.read(path, sheet)?;
        let key = Uuid::new_v4().to_string();
        let summary = DatasetSummary { key: key.clone(),
                                       headers: table.headers.clone(),
                                       rows: table.rows.clone() };
        // フロントは単一データセット前提のため、新規ロード時に旧エントリを破棄する
        self.cache.clear();
        self.cache.insert(key, table);
        Ok(summary)
    }

    fn read(&self,
            path: &Path,
            sheet: Option<String>)
            -> Result<ParsedTable, String> {
        match file_ext(path).as_deref() {
            Some("csv") => csv_reader::read_csv(path),
            Some("xlsx") | Some("xls") => {
                let sheet_name = sheet.ok_or_else(|| "XLSX にはシート名が必要です".to_string())?;
                xlsx_reader::read_xlsx(path, &sheet_name)
            },
            other => Err(format!("未対応のファイル形式: {other:?}")),
        }
    }
}

fn file_ext(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
}
