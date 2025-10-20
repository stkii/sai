# Analyses registry: maps analysis name to handler function
# Each handler takes (data, options) and returns ParsedTable-like list(headers, rows)

GetAnalysesRegistry <- function(r_dir) {
  # Source modules so that handlers are available
  src_desc <- file.path(r_dir, "descriptive.R")
  src_corr <- file.path(r_dir, "correlation.R")
  if (!file.exists(src_desc)) stop("descriptive.R not found under src-r/R")
  if (!file.exists(src_corr)) stop("correlation.R not found under src-r/R")

  source(src_desc, local = FALSE)
  source(src_corr, local = FALSE)

  # Build registry
  list(
    descriptive = RunDescriptive,
    correlation = RunCorrelation
  )
}

