use serde::Serialize;
use std::path::Path;
use tempfile::{
    Builder,
    NamedTempFile,
};

pub(crate) struct JsonTempFile {
    file: NamedTempFile,
}

impl JsonTempFile {
    pub(crate) fn path(&self) -> &Path {
        self.file.path()
    }

    pub(crate) fn create(prefix: &str,
                         value: &impl Serialize)
                         -> Result<Self, String> {
        let mut file = Builder::new().prefix(prefix)
                                     .suffix(".json")
                                     .tempfile()
                                     .map_err(|e| format!("Failed to create temp file: {}", e))?;
        serde_json::to_writer(file.as_file_mut(), value).map_err(|e| {
                                                            format!("Failed to serialize json: {}", e)
                                                        })?;
        Ok(Self { file })
    }
}
