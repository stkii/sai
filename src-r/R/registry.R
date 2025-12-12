# Analyses registry: maps analysis name to handler function

GetAnalysesRegistry <- function(r_dir) {
  # Source shared constants/utilities
  src_err <- base::file.path(r_dir, "err.R")
  if (!base::file.exists(src_err)) {
    # If err.R itself is not found, we can't use StopWithErrCode, so stop directly with an error code
    base::stop("ERR-999: R core module 'err.R' not found under src-r/R")
  }
  base::source(src_err, local = FALSE)

  src_const <- base::file.path(r_dir, "constants.R")
  if (!base::file.exists(src_const)) StopWithErrCode("ERR-901")
  base::source(src_const, local = FALSE)

  # Source modules so that handlers are available
  src_desc <- base::file.path(r_dir, "descriptive.R")
  src_corr <- base::file.path(r_dir, "correlation.R")
  src_rel  <- base::file.path(r_dir, "reliability.R")
  src_reg  <- base::file.path(r_dir, "regression.R")
  src_desn <- base::file.path(r_dir, "design.R")
  src_center <- base::file.path(r_dir, "centering.R")
  if (!base::file.exists(src_desc)) StopWithErrCode("ERR-903")
  if (!base::file.exists(src_corr)) StopWithErrCode("ERR-904")
  if (!base::file.exists(src_rel))  StopWithErrCode("ERR-905")
  if (!base::file.exists(src_reg))  StopWithErrCode("ERR-906")
  if (!base::file.exists(src_desn)) StopWithErrCode("ERR-907")
  if (!base::file.exists(src_center)) StopWithErrCode("ERR-908")

  base::source(src_desc, local = FALSE)
  base::source(src_corr, local = FALSE)
  base::source(src_rel,  local = FALSE)
  base::source(src_reg,  local = FALSE)
  base::source(src_desn, local = FALSE)
  base::source(src_center, local = FALSE)

  # Build registry
  list(
    descriptive = RunDescriptive,
    correlation = RunCorrelation,
    reliability = RunReliability,
    regression  = RunRegression,
    design      = RunDesign
  )
}
