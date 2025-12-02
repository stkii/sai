# Analyses registry: maps analysis name to handler function
# Each handler takes (data, options) and returns ParsedTable-like list(headers, rows)

GetAnalysesRegistry <- function(r_dir) {
  # Source shared constants/utilities
  src_const <- base::file.path(r_dir, "constants.R")
  if (!base::file.exists(src_const)) stop("constants.R not found under src-r/R")
  base::source(src_const, local = FALSE)

  # Source modules so that handlers are available
  src_desc <- base::file.path(r_dir, "descriptive.R")
  src_corr <- base::file.path(r_dir, "correlation.R")
  src_rel  <- base::file.path(r_dir, "reliability.R")
  src_reg  <- base::file.path(r_dir, "regression.R")
  src_desn <- base::file.path(r_dir, "design.R")
  src_center <- base::file.path(r_dir, "centering.R")
  if (!base::file.exists(src_desc)) stop("descriptive.R not found under src-r/R")
  if (!base::file.exists(src_corr)) stop("correlation.R not found under src-r/R")
  if (!base::file.exists(src_rel))  stop("reliability.R not found under src-r/R")
  if (!base::file.exists(src_reg))  stop("regression.R not found under src-r/R")
  if (!base::file.exists(src_desn)) stop("design.R not found under src-r/R")
  if (!base::file.exists(src_center)) stop("centering.R not found under src-r/R")

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
