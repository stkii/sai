use std::fs::OpenOptions;
use std::io::Write;
use std::path::{
    Path,
    PathBuf,
};
use std::sync::Mutex;

use crate::models::HistoryRecord;

pub struct HistoryStore {
    path: PathBuf,
    write_lock: Mutex<()>,
}

impl HistoryStore {
    pub fn new(path: PathBuf) -> Self {
        Self { path,
               write_lock: Mutex::new(()) }
    }

    pub fn append(&self,
                  record: &HistoryRecord)
                  -> Result<(), String> {
        let line = serde_json::to_string(record).map_err(|e| format!("JSON 変換失敗: {e}"))?;
        let _guard = self.write_lock.lock().unwrap();
        ensure_parent(&self.path)?;
        let mut file = OpenOptions::new().create(true)
                                         .append(true)
                                         .open(&self.path)
                                         .map_err(|e| format!("履歴ファイルのオープン失敗: {e}"))?;
        writeln!(file, "{line}").map_err(|e| format!("履歴ファイルの書込失敗: {e}"))?;
        Ok(())
    }

    pub fn load_all(&self) -> Result<Vec<HistoryRecord>, String> {
        if !self.path.exists() {
            return Ok(Vec::new());
        }
        let content =
            std::fs::read_to_string(&self.path).map_err(|e| format!("履歴ファイルの読込失敗: {e}"))?;
        let mut records = Vec::new();
        for (i, line) in content.lines().enumerate() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            match serde_json::from_str::<HistoryRecord>(trimmed) {
                Ok(r) => records.push(r),
                Err(e) => log::warn!("履歴 {} 行目をスキップ: {}", i + 1, e),
            }
        }
        Ok(records)
    }

    pub fn clear(&self) -> Result<(), String> {
        let _guard = self.write_lock.lock().unwrap();
        if self.path.exists() {
            std::fs::remove_file(&self.path).map_err(|e| format!("履歴ファイルの削除失敗: {e}"))?;
        }
        Ok(())
    }

    pub fn remove(&self,
                  id: &str)
                  -> Result<(), String> {
        let _guard = self.write_lock.lock().unwrap();
        if !self.path.exists() {
            return Ok(());
        }
        let content =
            std::fs::read_to_string(&self.path).map_err(|e| format!("履歴ファイルの読込失敗: {e}"))?;
        let mut kept: Vec<String> = Vec::new();
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            match serde_json::from_str::<HistoryRecord>(trimmed) {
                Ok(r) => {
                    if r.id != id {
                        kept.push(trimmed.to_string());
                    }
                },
                Err(_) => {
                    kept.push(trimmed.to_string());
                },
            }
        }
        let tmp_path = self.path.with_extension("jsonl.tmp");
        {
            let mut file =
                std::fs::File::create(&tmp_path).map_err(|e| format!("一時ファイル作成失敗: {e}"))?;
            for line in &kept {
                writeln!(file, "{line}").map_err(|e| format!("一時ファイル書込失敗: {e}"))?;
            }
        }
        std::fs::rename(&tmp_path, &self.path).map_err(|e| format!("履歴ファイルの置換失敗: {e}"))?;
        Ok(())
    }
}

fn ensure_parent(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("親ディレクトリ作成失敗: {e}"))?;
    }
    Ok(())
}
