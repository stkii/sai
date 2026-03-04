use std::process::{
    Command,
    Stdio,
};
use std::time::Duration;

use wait_timeout::ChildExt;

const R_ANALYSIS_TIMEOUT: Duration = Duration::from_secs(30);
const R_OUTPUT_SNIPPET_LIMIT: usize = 4000;

pub(crate) fn run_rscript_with_timeout(mut command: Command) -> Result<Vec<u8>, String> {
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
