use std::env;
use std::path::PathBuf;
use std::process::Command;

use serde_json::Value;

use crate::dto::{
    AnalysisResult,
    NumericDataset,
};
use crate::infra::r::process::run_rscript_with_timeout;
use crate::infra::r::temp_json::{
    JsonTempFile,
    RAnalysisJob,
};

pub fn run_r_analysis(analysis_type: &str,
                      dataset: &NumericDataset,
                      options: &Value)
                      -> Result<AnalysisResult, String> {
    run_r_job(RAnalysisJob { analysis_type,
                             dataset: Some(dataset),
                             options })
}

fn resolve_cli_path() -> Result<PathBuf, String> {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let path = PathBuf::from(manifest_dir).join("../src-r/cli.R");
    path.canonicalize()
        .map_err(|e| format!("Failed to resolve cli.R: {}", e))
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
