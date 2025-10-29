#!/usr/bin/env Rscript

# Unified CLI entry for analyses (descriptive, correlation, reliability, regression)
# - Resolve project root (env-var first, then script-relative fallback)
# - Load registry and utilities
# - Read JSON input, dispatch to analysis, write JSON to an output file
#
# Usage:
#   cli.R descriptive <input_json_path> <output_json_path> [order]
#   cli.R correlation <input_json_path> <output_json_path> [options_json]
#   cli.R reliability <input_json_path> <output_json_path>
#   cli.R regression  <input_json_path> <output_json_path> [options_json]

# ------------------------
# Args parsing
# ------------------------
args_trailing <- commandArgs(trailingOnly = TRUE)
if (length(args_trailing) < 3) {
  stop("Usage: cli.R <descriptive|correlation|reliability|regression> <input_json_path> <output_json_path> [extra]")
}
analysis <- args_trailing[[1]]
input_path <- args_trailing[[2]]
output_path <- args_trailing[[3]]
extra_arg <- if (length(args_trailing) >= 4) args_trailing[[4]] else NA_character_
if (!file.exists(input_path)) stop(paste0("Input file not found: ", input_path))

# ------------------------
# Resolve project root and R dir (src-r/R only)
# ------------------------
ResolveScriptPath <- function() {
  args_full <- commandArgs(trailingOnly = FALSE)
  file_arg <- grep("^--file=", args_full, value = TRUE)
  if (length(file_arg) == 1) return(normalizePath(sub("^--file=", "", file_arg)))
  if (exists("ofile", where = sys.frames()[[1]])) return(normalizePath(sys.frames()[[1]]$ofile))
  stop("Failed to resolve CLI script path")
}

# script is expected at <repo>/src-r/cli.R
script_path <- ResolveScriptPath()
root <- normalizePath(dirname(script_path))
r_dir <- file.path(root, "R")
if (!dir.exists(r_dir)) stop("R directory not found: expected 'src-r/R' next to cli.R")

# ------------------------
# Optional renv activation
# ------------------------
renv_activate <- file.path(root, "renv", "activate.R")
if (file.exists(renv_activate)) {
  source(renv_activate, local = FALSE)
}

# Ensure jsonlite
suppressWarnings(suppressMessages({
  if (!requireNamespace("jsonlite", quietly = TRUE)) stop("Package 'jsonlite' is required.")
}))

# Load utilities and registry
utils_core <- file.path(r_dir, "utils.R")
if (file.exists(utils_core)) source(utils_core, local = FALSE)
io_src <- file.path(r_dir, "io.R")
if (file.exists(io_src)) source(io_src, local = FALSE)
registry_src <- file.path(r_dir, "registory.R")
if (!file.exists(registry_src)) stop("registory.R not found under src-r/R")
source(registry_src, local = FALSE)

analyses <- GetAnalysesRegistry(r_dir)
handler <- analyses[[analysis]]
if (is.null(handler) || !is.function(handler)) {
  stop(paste0("Unknown analysis: ", analysis, " (supported: ", paste(names(analyses), collapse=", "), ")"))
}

# ------------------------
# Read input JSON
# ------------------------
raw_obj <- if (exists("ReadJsonFile")) ReadJsonFile(input_path) else {
  txt <- paste(readLines(input_path, warn = FALSE), collapse = "\n")
  jsonlite::fromJSON(txt)
}

# Preserve column order using optional "__order" hint when provided by the caller.
dat <- raw_obj
ord <- NULL
if (is.list(raw_obj) && !is.data.frame(raw_obj) && !is.null(raw_obj[["__data"]])) {
  dat <- raw_obj[["__data"]]
  if (!is.null(raw_obj[["__order"]])) ord <- as.character(raw_obj[["__order"]])
}
if (is.list(dat) && !is.data.frame(dat)) dat <- as.data.frame(dat, check.names = FALSE, stringsAsFactors = FALSE)
if (!is.null(ord) && is.data.frame(dat)) {
  cols <- colnames(dat)
  ord2 <- ord[ord %in% cols]
  rest <- cols[!cols %in% ord2]
  dat <- dat[, c(ord2, rest), drop = FALSE]
}

# ------------------------
# Build options and run
# ------------------------
options_list <- list()
if (identical(analysis, "descriptive")) {
  ord <- tryCatch({
    o <- extra_arg
    if (is.null(o) || is.na(o) || !nzchar(o)) 'default' else as.character(o)
  }, error = function(e) 'default')
  options_list$order <- ord
} else if (identical(analysis, "correlation")) {
  options_list <- tryCatch({
    if (is.null(extra_arg) || is.na(extra_arg) || !nzchar(extra_arg)) list() else jsonlite::fromJSON(extra_arg)
  }, error = function(e) list())
} else if (identical(analysis, "regression")) {
  options_list <- tryCatch({
    if (is.null(extra_arg) || is.na(extra_arg) || !nzchar(extra_arg)) list() else jsonlite::fromJSON(extra_arg)
  }, error = function(e) list())
}

out <- handler(dat, options_list)

# ------------------------
# Write JSON to output file
# ------------------------
if (exists("WriteJsonFile")) {
  WriteJsonFile(output_path, out)
} else {
  txt <- jsonlite::toJSON(out, auto_unbox = TRUE, na = "null")
  con <- file(output_path, open = "w", encoding = "UTF-8")
  on.exit(try(close(con), silent = TRUE), add = TRUE)
  writeLines(txt, con = con, sep = "\n", useBytes = TRUE)
}
