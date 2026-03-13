use std::fmt::Display;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum AnalysisErrorKind {
    InputValidation,
    DatasetNotFound,
    AnalysisLogFailure,
    RExecutionFailure,
    InvalidAnalysisResult,
}

impl AnalysisErrorKind {
    pub(crate) fn code(self) -> &'static str {
        match self {
            AnalysisErrorKind::InputValidation => "ANALYSIS_INPUT_VALIDATION",
            AnalysisErrorKind::DatasetNotFound => "ANALYSIS_DATASET_NOT_FOUND",
            AnalysisErrorKind::AnalysisLogFailure => "ANALYSIS_LOG_FAILURE",
            AnalysisErrorKind::RExecutionFailure => "ANALYSIS_R_EXECUTION_FAILURE",
            AnalysisErrorKind::InvalidAnalysisResult => "ANALYSIS_INVALID_RESULT",
        }
    }
}

pub(crate) fn classified_error(kind: AnalysisErrorKind,
                               message: impl AsRef<str>)
                               -> String {
    format!("[{}] {}", kind.code(), message.as_ref())
}

pub(crate) fn classified_error_with_source(kind: AnalysisErrorKind,
                                           context: &str,
                                           source: impl Display)
                                           -> String {
    classified_error(kind, format!("{}: {}", context, source))
}
