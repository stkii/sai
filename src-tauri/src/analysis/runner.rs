use std::path::{
    Path,
    PathBuf,
};
use std::process::{
    Command,
    Stdio,
};
use std::time::{
    Duration,
    Instant,
    SystemTime,
    UNIX_EPOCH,
};
use std::{
    fs,
    thread,
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

const R_ANALYSIS_TIMEOUT: Duration = Duration::from_secs(120);
const R_OUTPUT_SNIPPET_LIMIT: usize = 4000;

pub fn run_r_analysis(analysis_type: &str,
                      dataset: &cache::NumericDataset,
                      options: &Value)
                      -> Result<AnalysisResult, String> {
    let dataset_path = write_dataset_json(dataset)?;
    let dataset_guard = TempFileGuard::new(dataset_path);
    let options_path = write_options_json(options)?;
    let options_guard = TempFileGuard::new(options_path);
    let cli_path = resolve_cli_path()?;

    let mut command = Command::new("Rscript");
    command.arg(cli_path)
           .arg("--analysis")
           .arg(analysis_type)
           .arg("--input")
           .arg(dataset_guard.path())
           .arg("--input-format")
           .arg("json")
           .arg("--options")
           .arg(options_guard.path());
    let output = run_rscript_with_timeout(command)?;

    let result: AnalysisResult =
        serde_json::from_slice(&output).map_err(|e| format!("Failed to parse analysis output: {}", e))?;
    result.validate()?;

    Ok(result)
}

pub fn run_r_power_test(options: &Value) -> Result<AnalysisResult, String> {
    let options_path = write_options_json(options)?;
    let options_guard = TempFileGuard::new(options_path);
    let cli_path = resolve_cli_path()?;

    let mut command = Command::new("Rscript");
    command.arg(cli_path)
           .arg("--analysis")
           .arg("power")
           .arg("--options")
           .arg(options_guard.path());
    let output = run_rscript_with_timeout(command)?;

    let result: AnalysisResult =
        serde_json::from_slice(&output).map_err(|e| format!("Failed to parse analysis output: {}", e))?;
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

fn temp_log_path(prefix: &str) -> Result<PathBuf, String> {
    let nanos = SystemTime::now().duration_since(UNIX_EPOCH)
                                 .map_err(|e| format!("Failed to read time: {}", e))?
                                 .as_nanos();
    let filename = format!("{}_{}.log", prefix, nanos);
    Ok(std::env::temp_dir().join(filename))
}

fn run_rscript_with_timeout(mut command: Command) -> Result<Vec<u8>, String> {
    let stdout_path = temp_log_path("sai_r_stdout")?;
    let stdout_guard = TempFileGuard::new(stdout_path.clone());
    let stderr_path = temp_log_path("sai_r_stderr")?;
    let stderr_guard = TempFileGuard::new(stderr_path.clone());

    let stdout_file =
        fs::File::create(&stdout_path).map_err(|e| format!("Failed to create stdout log: {}", e))?;
    let stderr_file =
        fs::File::create(&stderr_path).map_err(|e| format!("Failed to create stderr log: {}", e))?;

    command.stdout(Stdio::from(stdout_file))
           .stderr(Stdio::from(stderr_file));

    let mut child = command.spawn()
                           .map_err(|e| format!("Failed to run Rscript: {}", e))?;
    let started_at = Instant::now();

    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let stdout = fs::read(stdout_guard.path()).unwrap_or_default();
                let stderr = fs::read(stderr_guard.path()).unwrap_or_default();
                if status.success() {
                    return Ok(stdout);
                }
                return Err(format_r_failure(&stderr, &stdout));
            },
            Ok(None) => {
                if started_at.elapsed() >= R_ANALYSIS_TIMEOUT {
                    let _ = child.kill();
                    let _ = child.wait();
                    let stdout = fs::read(stdout_guard.path()).unwrap_or_default();
                    let stderr = fs::read(stderr_guard.path()).unwrap_or_default();
                    return Err(format_r_timeout(&stderr, &stdout));
                }
                thread::sleep(Duration::from_millis(50));
            },
            Err(e) => {
                return Err(format!("Failed to poll Rscript process: {}", e));
            },
        }
    }
}

fn format_r_failure(stderr: &[u8],
                    stdout: &[u8])
                    -> String {
    let stderr_snippet = summarize_output(stderr);
    let stdout_snippet = summarize_output(stdout);
    match (stderr_snippet.is_empty(), stdout_snippet.is_empty()) {
        (false, false) => format!("R analysis failed: stderr: {}; stdout: {}",
                                  stderr_snippet, stdout_snippet),
        (false, true) => format!("R analysis failed: stderr: {}", stderr_snippet),
        (true, false) => format!("R analysis failed: stdout: {}", stdout_snippet),
        (true, true) => "R analysis failed".to_string(),
    }
}

fn format_r_timeout(stderr: &[u8],
                    stdout: &[u8])
                    -> String {
    let stderr_snippet = summarize_output(stderr);
    let stdout_snippet = summarize_output(stdout);
    let base = format!("R analysis timed out after {}s", R_ANALYSIS_TIMEOUT.as_secs());
    match (stderr_snippet.is_empty(), stdout_snippet.is_empty()) {
        (false, false) => format!("{}; stderr: {}; stdout: {}", base, stderr_snippet, stdout_snippet),
        (false, true) => format!("{}; stderr: {}", base, stderr_snippet),
        (true, false) => format!("{}; stdout: {}", base, stdout_snippet),
        (true, true) => base,
    }
}

fn summarize_output(bytes: &[u8]) -> String {
    let text = String::from_utf8_lossy(bytes);
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let total_chars = trimmed.chars().count();
    if total_chars <= R_OUTPUT_SNIPPET_LIMIT {
        return trimmed.to_string();
    }
    let head_len = R_OUTPUT_SNIPPET_LIMIT / 2;
    let tail_len = R_OUTPUT_SNIPPET_LIMIT / 2;
    let head: String = trimmed.chars().take(head_len).collect();
    let tail: String = trimmed.chars()
                              .skip(total_chars.saturating_sub(tail_len))
                              .collect();
    format!("{} ... {}", head, tail)
}
