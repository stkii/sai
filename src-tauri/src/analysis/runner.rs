use std::fs;
use std::path::{
    Path,
    PathBuf,
};
use std::process::Command;
use std::time::{
    SystemTime,
    UNIX_EPOCH,
};

use serde_json::Value;

use crate::cache;
use crate::dto::AnalysisResult;

struct TempFileGuard {
    path: PathBuf,
}

impl TempFileGuard {
    fn new(path: PathBuf) -> Self {
        Self { path }
    }

    fn path(&self) -> &Path {
        &self.path
    }
}

impl Drop for TempFileGuard {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
    }
}

pub fn run_r_analysis(analysis_type: &str,
                      dataset: &cache::NumericDataset,
                      options: &Value)
                      -> Result<AnalysisResult, String> {
    let dataset_path = write_dataset_json(dataset)?;
    let dataset_guard = TempFileGuard::new(dataset_path);
    let options_path = write_options_json(options)?;
    let options_guard = TempFileGuard::new(options_path);
    let cli_path = resolve_cli_path()?;

    let output = Command::new("Rscript").arg(cli_path)
                                        .arg("--analysis")
                                        .arg(analysis_type)
                                        .arg("--input")
                                        .arg(dataset_guard.path())
                                        .arg("--input-format")
                                        .arg("json")
                                        .arg("--options")
                                        .arg(options_guard.path())
                                        .output()
                                        .map_err(|e| format!("Failed to run Rscript: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!("R analysis failed: {}{}", stderr, stdout));
    }

    let result: AnalysisResult =
        serde_json::from_slice(&output.stdout).map_err(|e| {
                                                  format!("Failed to parse analysis output: {}", e)
                                              })?;
    result.validate()?;

    Ok(result)
}

pub fn run_r_power_test(options: &Value) -> Result<AnalysisResult, String> {
    let options_path = write_options_json(options)?;
    let options_guard = TempFileGuard::new(options_path);
    let cli_path = resolve_cli_path()?;

    let output = Command::new("Rscript").arg(cli_path)
                                        .arg("--analysis")
                                        .arg("power")
                                        .arg("--options")
                                        .arg(options_guard.path())
                                        .output()
                                        .map_err(|e| format!("Failed to run Rscript: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!("R analysis failed: {}{}", stderr, stdout));
    }

    let result: AnalysisResult =
        serde_json::from_slice(&output.stdout).map_err(|e| {
                                                  format!("Failed to parse analysis output: {}", e)
                                              })?;
    result.validate()?;

    Ok(result)
}

fn resolve_cli_path() -> Result<PathBuf, String> {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let path = PathBuf::from(manifest_dir).join("../src-r/cli.R");
    path.canonicalize()
        .map_err(|e| format!("Failed to resolve cli.R: {}", e))
}

fn write_dataset_json(dataset: &cache::NumericDataset) -> Result<PathBuf, String> {
    let path = temp_json_path("sai_dataset")?;
    let payload = serde_json::to_string(dataset).map_err(|e| format!("Failed to serialize dataset: {}", e))?;
    fs::write(&path, payload).map_err(|e| format!("Failed to write dataset json: {}", e))?;
    Ok(path)
}

fn write_options_json(options: &Value) -> Result<PathBuf, String> {
    let path = temp_json_path("sai_options")?;
    let payload = serde_json::to_string(options).map_err(|e| format!("Failed to serialize options: {}", e))?;
    fs::write(&path, payload).map_err(|e| format!("Failed to write options json: {}", e))?;
    Ok(path)
}

fn temp_json_path(prefix: &str) -> Result<PathBuf, String> {
    let nanos = SystemTime::now().duration_since(UNIX_EPOCH)
                                 .map_err(|e| format!("Failed to read time: {}", e))?
                                 .as_nanos();
    let filename = format!("{}_{}.json", prefix, nanos);
    Ok(std::env::temp_dir().join(filename))
}
