#!/usr/bin/env Rscript

# Unified CLI entry for analyses (current: descriptive only)
# - Resolve project root (env-var first, then script-relative fallback)
# - Source R/describe.R defining DescribeParsed()
# - Read JSON input, dispatch to analysis, write JSON to an output file
#
# Usage: cli.R descriptive <input_json_path> <output_json_path>

# ------------------------
# Args parsing
# ------------------------
args_trailing <- commandArgs(trailingOnly = TRUE)
if (length(args_trailing) < 3) {
  stop("Usage: cli.R descriptive <input_json_path> <output_json_path> [order]")
}
analysis <- args_trailing[[1]]
input_path <- args_trailing[[2]]
output_path <- args_trailing[[3]]
order <- if (length(args_trailing) >= 4) args_trailing[[4]] else NA_character_
if (!file.exists(input_path)) stop(paste0("Input file not found: ", input_path))

# ------------------------
# Resolve project root
# ------------------------
resolve_script_path <- function() {
  args_full <- commandArgs(trailingOnly = FALSE)
  file_arg <- grep("^--file=", args_full, value = TRUE)
  if (length(file_arg) == 1) return(normalizePath(sub("^--file=", "", file_arg)))
  if (exists("ofile", where = sys.frames()[[1]])) return(normalizePath(sys.frames()[[1]]$ofile))
  stop("Failed to resolve CLI script path")
}

root <- Sys.getenv("R_PROJECT_ROOT", unset = NA_character_)
if (is.na(root) || !nzchar(root)) {
  script_path <- resolve_script_path()
  # script is expected at <repo>/src-r/cli.R
  cli_dir <- dirname(script_path)
  # src-r directory
  root <- cli_dir
}
root <- normalizePath(root)
r_dir <- file.path(root, "R")
if (!dir.exists(r_dir)) {
  # dev fallbacks relative to CWD
  alt1 <- file.path("src-r", "R")
  alt2 <- file.path("..", "src-r", "R")
  alt3 <- file.path("../..", "src-r", "R")
  for (alt in c(alt1, alt2, alt3)) {
    if (dir.exists(alt)) { r_dir <- alt; break }
  }
}
if (!dir.exists(r_dir)) stop("R directory not found (expected at src-r/R)")

# ------------------------
# Optional renv activation
# ------------------------
renv_activate <- file.path(root, "renv", "activate.R")
if (file.exists(renv_activate)) {
  # Activate project library paths
  source(renv_activate, local = FALSE)
}

# Ensure jsonlite
suppressWarnings(suppressMessages({
  if (!requireNamespace("jsonlite", quietly = TRUE)) stop("Package 'jsonlite' is required.")
}))

# Load shared utilities if available (optional)
utils_src <- file.path(r_dir, "utils.R")
if (file.exists(utils_src)) {
  source(utils_src, local = TRUE)
}

# ------------------------
# Dispatch (descriptive only for now)
# ------------------------
load_descriptive <- function() {
  # Current filename is descriptive.R (not describe.R)
  # Keep message explicit for easier debugging.
  src <- file.path(r_dir, "descriptive.R")
  if (!file.exists(src)) stop("descriptive.R not found under src-r/R")
  source(src, local = TRUE)
  fn_name <- "DescribeParsed"
  if (!exists(fn_name) || !is.function(get(fn_name))) stop("DescribeParsed() not defined after sourcing")
  get(fn_name)
}

if (analysis != "descriptive") {
  stop(paste0("Unknown analysis: ", analysis, " (supported: descriptive)"))
}

# ------------------------
# Read input JSON
# ------------------------
info <- tryCatch(file.info(input_path), error = function(e) NULL)
if (is.null(info)) stop(paste0("Failed to stat input path: ", input_path))
if (isTRUE(info$isdir)) stop(paste0("Input path is a directory (expected file): ", input_path))

# Avoid ambiguity: read file contents then parse JSON
json_txt <- tryCatch(paste(readLines(input_path, warn = FALSE), collapse = "\n"), error = function(e) {
  stop(paste0("Failed to read input JSON file: ", input_path, " (", e$message, ")"))
})
dat <- jsonlite::fromJSON(json_txt)
if (is.list(dat) && !is.data.frame(dat)) dat <- as.data.frame(dat)

# ------------------------
# Run
# ------------------------
runner <- load_descriptive()
out <- runner(dat)

# Optional sorting using utils::Sort
ord <- tryCatch({
  o <- order
  if (is.null(o) || is.na(o) || !nzchar(o)) 'default' else as.character(o)
}, error = function(e) 'default')
try({
  sorter <- Sort(ord)
  out <- sorter(out)
}, silent = TRUE)

# Write JSON to output file
json_txt <- jsonlite::toJSON(out, auto_unbox = TRUE, na = "null")
con <- file(output_path, open = "w", encoding = "UTF-8")
on.exit(try(close(con), silent = TRUE), add = TRUE)
writeLines(json_txt, con = con, sep = "\n", useBytes = TRUE)
