use std::path::{
    Path,
    PathBuf,
};
use std::process::{
    Command,
    Stdio,
};
use std::time::Duration;

use serde::Serialize;
use serde_json::Value;
use tempfile::{
    Builder,
    NamedTempFile,
};
use wait_timeout::ChildExt;

use crate::cache;
use crate::dto::AnalysisResult;

struct JsonTempFile {
    file: NamedTempFile,
}

impl JsonTempFile {
    fn path(&self) -> &Path {
        self.file.path()
    }

    fn create(prefix: &str,
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

const R_ANALYSIS_TIMEOUT: Duration = Duration::from_secs(120);
const R_OUTPUT_SNIPPET_LIMIT: usize = 4000;

struct RAnalysisJob<'a> {
    analysis_type: &'a str,
    dataset: Option<&'a cache::NumericDataset>,
    options: &'a Value,
}

pub fn run_r_analysis(analysis_type: &str,
                      dataset: &cache::NumericDataset,
                      options: &Value)
                      -> Result<AnalysisResult, String> {
    run_r_job(RAnalysisJob { analysis_type,
                             dataset: Some(dataset),
                             options })
}

pub fn run_r_power_test(options: &Value) -> Result<AnalysisResult, String> {
    run_r_job(RAnalysisJob { analysis_type: "power",
                             dataset: None,
                             options })
}

fn run_r_job(job: RAnalysisJob<'_>) -> Result<AnalysisResult, String> {
    let dataset_file = match job.dataset {
        Some(dataset) => Some(JsonTempFile::create("sai_dataset", dataset)?),
        None => None,
    };
    let options_file = JsonTempFile::create("sai_options", job.options)?;
    let cli_path = resolve_cli_path()?;

    let mut command = Command::new("Rscript");
    command.arg(cli_path)
           .arg("--analysis")
           .arg(job.analysis_type)
           .arg("--options")
           .arg(options_file.path());
    if let Some(dataset_file) = dataset_file.as_ref() {
        command.arg("--input")
               .arg(dataset_file.path())
               .arg("--input-format")
               .arg("json");
    }
    let output = run_rscript_with_timeout(command)?;
    parse_analysis_output(&output)
}

fn parse_analysis_output(output: &[u8]) -> Result<AnalysisResult, String> {
    let result: AnalysisResult =
        serde_json::from_slice(output).map_err(|e| format!("Failed to parse analysis output: {}", e))?;
    result.validate()?;
    Ok(result)
}

fn resolve_cli_path() -> Result<PathBuf, String> {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let path = PathBuf::from(manifest_dir).join("../src-r/cli.R");
    path.canonicalize()
        .map_err(|e| format!("Failed to resolve cli.R: {}", e))
}

fn run_rscript_with_timeout(mut command: Command) -> Result<Vec<u8>, String> {
    command.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = command.spawn()
                           .map_err(|e| format!("Failed to run Rscript: {}", e))?;
    match child.wait_timeout(R_ANALYSIS_TIMEOUT) {
        Ok(Some(_)) => {
            let output = child.wait_with_output()
                              .map_err(|e| format!("Failed to read Rscript output: {}", e))?;
            if output.status.success() {
                Ok(output.stdout)
            } else {
                Err(format_r_failure(&output.stderr, &output.stdout))
            }
        },
        Ok(None) => {
            let _ = child.kill();
            let output = child.wait_with_output()
                              .map_err(|e| format!("Failed to read timed out output: {}", e))?;
            Err(format_r_timeout(&output.stderr, &output.stdout))
        },
        Err(e) => Err(format!("Failed to wait for Rscript process: {}", e)),
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
