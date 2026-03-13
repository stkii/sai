use std::env;
use std::path::PathBuf;
use std::process::Command;

use serde::Serialize;
use serde_json::Value;

use crate::domain::analysis::error::{
    AnalysisErrorKind,
    classified_error_with_source,
};
use crate::domain::analysis::method::Method;
use crate::domain::analysis::model::AnalysisResult;
use crate::domain::input::numeric::NumericDataset;
use crate::domain::input::string_mixed::StringMixedDataset;
use crate::infra::r::process::run_rscript_with_timeout;
use crate::infra::r::temp_json::JsonTempFile;

pub fn run_r_analysis(method: Method,
                      dataset: &NumericDataset,
                      options: &Value)
                      -> Result<AnalysisResult, String> {
    run_r_job(method, Some(dataset), options)
}

pub fn run_r_analysis_without_dataset(method: Method,
                                      options: &Value)
                                      -> Result<AnalysisResult, String> {
    run_r_job::<Value>(method, None, options)
}

pub fn run_r_analysis_string_mixed(method: Method,
                                   dataset: &StringMixedDataset,
                                   options: &Value)
                                   -> Result<AnalysisResult, String> {
    run_r_job(method, Some(dataset), options)
}

fn resolve_cli_path() -> Result<PathBuf, String> {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let path = PathBuf::from(manifest_dir).join("../src-r/cli.R");
    path.canonicalize().map_err(|e| {
                           classified_error_with_source(AnalysisErrorKind::RExecutionFailure,
                                                        "failed to resolve cli.R",
                                                        e)
                       })
}

fn run_r_job<T: Serialize>(method: Method,
                           dataset: Option<&T>,
                           options: &Value)
                           -> Result<AnalysisResult, String> {
    let dataset_file = match dataset {
        Some(ds) => Some(JsonTempFile::create("sai_dataset", ds).map_err(|e| {
                             classified_error_with_source(AnalysisErrorKind::RExecutionFailure,
                                                          "failed to create dataset temp file",
                                                          e)
                         })?),
        None => None,
    };
    let options_file = JsonTempFile::create("sai_options", options).map_err(|e| {
                           classified_error_with_source(AnalysisErrorKind::RExecutionFailure,
                                                        "failed to create options temp file",
                                                        e)
                       })?;
    let cli_path = resolve_cli_path()?;

    let mut command = Command::new("Rscript");
    command.arg(cli_path)
           .arg("--analysis")
           .arg(method.as_str())
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
    let result: AnalysisResult = serde_json::from_slice(output).map_err(|e| {
                                     classified_error_with_source(AnalysisErrorKind::InvalidAnalysisResult,
                                                                  "failed to parse analysis output",
                                                                  e)
                                 })?;
    result.validate().map_err(|e| {
                          classified_error_with_source(AnalysisErrorKind::InvalidAnalysisResult,
                                                       "analysis output validation failed",
                                                       e)
                      })?;
    Ok(result)
}
