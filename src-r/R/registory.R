# Analyses registry: maps analysis name to handler function
# Each handler takes (data, options) and returns ParsedTable-like list(headers, rows)

GetAnalysesRegistry <- function(r_dir) {
  # Source modules so that handlers are available
  src_desc <- base::file.path(r_dir, "descriptive.R")
  src_corr <- base::file.path(r_dir, "correlation.R")
  src_rel  <- base::file.path(r_dir, "reliability.R")
  src_reg  <- base::file.path(r_dir, "regression.R")
  if (!base::file.exists(src_desc)) stop("descriptive.R not found under src-r/R")
  if (!base::file.exists(src_corr)) stop("correlation.R not found under src-r/R")
  if (!base::file.exists(src_rel))  stop("reliability.R not found under src-r/R")
  if (!base::file.exists(src_reg))  stop("regression.R not found under src-r/R")

  base::source(src_desc, local = FALSE)
  base::source(src_corr, local = FALSE)
  base::source(src_rel,  local = FALSE)
  base::source(src_reg,  local = FALSE)

  # Build registry
  list(
    descriptive = RunDescriptive,
    correlation = RunCorrelation,
    reliability = RunReliability,
    regression  = RunRegression
  )
}
