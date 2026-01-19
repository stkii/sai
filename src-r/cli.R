#!/usr/bin/env Rscript

normalize_key <- function(key) {
  base::gsub("-", "_", base::tolower(key))
}

`%||%` <- function(a, b) {
  if (is.null(a) || !base::nzchar(a)) b else a
}

parse_args <- function(args) {
  opts <- list()
  i <- 1
  while (i <= length(args)) {
    arg <- args[[i]]
    if (base::startsWith(arg, "--")) {
      key <- base::sub("^--", "", arg)
      value <- NULL
      if (base::grepl("=", key, fixed = TRUE)) {
        parts <- base::strsplit(key, "=", fixed = TRUE)[[1]]
        key <- parts[[1]]
        value <- parts[[2]]
      } else if (i < length(args)) {
        value <- args[[i + 1]]
        i <- i + 1
      }
      opts[[normalize_key(key)]] <- value
    }
    i <- i + 1
  }
  opts
}

get_option_value <- function(payload, key) {
  if (is.null(payload) || !is.list(payload)) return(NULL)
  payload[[key]]
}

read_json_payload <- function(path) {
  if (!requireNamespace("jsonlite", quietly = TRUE)) {
    base::stop("jsonlite is required to parse JSON input")
  }

  if (is.null(path) || !base::nzchar(path) || identical(path, "-")) {
    input <- base::paste(base::readLines("stdin", warn = FALSE), collapse = "\n")
    if (!base::nzchar(input)) {
      base::stop("JSON input is empty")
    }
    return(jsonlite::fromJSON(input, simplifyVector = TRUE))
  }

  if (!base::file.exists(path)) {
    base::stop("JSON input file not found")
  }

  jsonlite::fromJSON(path, simplifyVector = TRUE)
}

load_module <- function(r_dir, file, err_code) {
  path <- base::file.path(r_dir, file)
  if (!base::file.exists(path)) {
    base::stop(base::paste0(err_code, ": R module '", file, "' not found under src-r/R"))
  }
  base::source(path, local = FALSE)
}

validate_numeric_dataset <- function(df) {
  is_numeric_col <- base::vapply(df, function(col) {
    base::is.numeric(col) || base::is.integer(col)
  }, logical(1))
  if (!base::all(is_numeric_col)) {
    StopWithErrCode("ERR-811")
  }
  TRUE
}

main <- function() {
  args <- commandArgs(trailingOnly = TRUE)
  opts <- parse_args(args)

  script_dir <- {
    cmd_args <- commandArgs(trailingOnly = FALSE)
    file_arg <- cmd_args[base::grepl("^--file=", cmd_args)]
    if (length(file_arg) > 0) {
      base::dirname(base::normalizePath(base::sub("^--file=", "", file_arg[[1]])))
    } else if (!is.null(sys.frames()[[1]]$ofile)) {
      base::dirname(base::normalizePath(sys.frames()[[1]]$ofile))
    } else {
      getwd()
    }
  }
  r_dir <- base::file.path(script_dir, "R")

  error_path <- base::file.path(r_dir, "error.R")
  if (!base::file.exists(error_path)) {
    base::stop("ERR-999: R core module 'error.R' not found under src-r/R")
  }
  base::source(error_path, local = FALSE)
  load_module(r_dir, "utils.R", "ERR-901")
  load_module(r_dir, "describe.R", "ERR-902")
  load_module(r_dir, "correlation.R", "ERR-903")
  load_module(r_dir, "reliability.R", "ERR-904")
  load_module(r_dir, "centering.R", "ERR-905")
  load_module(r_dir, "regression.R", "ERR-906")

  analysis <- opts$analysis %||% "descriptive"
  input_path <- opts$input %||% "-"
  input_format <- base::tolower(opts$input_format %||% "json")
  options_path <- opts$options %||% ""
  options_payload <- NULL
  if (base::nzchar(options_path)) {
    options_payload <- read_json_payload(options_path)
  }
  order_raw <- get_option_value(options_payload, "order")
  if (is.null(order_raw)) order_raw <- opts$order %||% "default"
  order <- base::as.character(order_raw)
  na_ignore_raw <- get_option_value(options_payload, "na_ignore")
  if (is.null(na_ignore_raw)) na_ignore_raw <- get_option_value(options_payload, "naIgnore")
  if (is.null(na_ignore_raw)) na_ignore_raw <- opts$na_ignore %||% "true"

  method_raw <- get_option_value(options_payload, "method")
  if (is.null(method_raw)) method_raw <- opts$method %||% ""
  use_raw <- get_option_value(options_payload, "use")
  if (is.null(use_raw)) use_raw <- opts$use %||% ""
  alternative_raw <- get_option_value(options_payload, "alternative")
  if (is.null(alternative_raw)) alternative_raw <- opts$alternative %||% ""
  view_raw <- get_option_value(options_payload, "view")
  if (is.null(view_raw)) view_raw <- opts$view %||% ""
  model_raw <- get_option_value(options_payload, "model")
  if (is.null(model_raw)) model_raw <- opts$model %||% "alpha"

  dependent_raw <- get_option_value(options_payload, "dependent")
  independent_raw <- get_option_value(options_payload, "independent")
  interactions_raw <- get_option_value(options_payload, "interactions")
  intercept_raw <- get_option_value(options_payload, "intercept")
  center_raw <- get_option_value(options_payload, "center")

  if (!identical(input_format, "json")) {
    base::stop("Only JSON input is supported")
  }

  if (base::is.logical(na_ignore_raw)) {
    na_ignore <- na_ignore_raw[[1]]
  } else {
    na_ignore <- base::tolower(base::as.character(na_ignore_raw)) %in% c("true", "1", "yes")
  }

  payload <- read_json_payload(input_path)
  df <- base::as.data.frame(payload, check.names = FALSE, stringsAsFactors = FALSE)
  IsDataFrame(df)
  validate_numeric_dataset(df)

  result <- NULL
  if (identical(analysis, "descriptive")) {
    result <- RunDescriptive(df, order = order, na_ig = na_ignore)
  } else if (identical(analysis, "correlation")) {
    result <- RunCorrelation(df,
                             method = base::as.character(method_raw),
                             use = base::as.character(use_raw),
                             alternative = base::as.character(alternative_raw),
                             view = base::as.character(view_raw))
  } else if (identical(analysis, "reliability")) {
    result <- RunReliability(df, model = base::as.character(model_raw))
  } else if (identical(analysis, "regression")) {
    result <- RunRegression(df,
                            dependent = dependent_raw,
                            independent = independent_raw,
                            interactions = interactions_raw,
                            intercept = intercept_raw,
                            center = center_raw)
  } else {
    base::stop("Unsupported analysis type")
  }

  output_payload <- if (identical(analysis, "regression")) {
    list(kind = "regression", regression = result)
  } else {
    list(kind = "table", table = result)
  }

  output <- jsonlite::toJSON(output_payload, auto_unbox = TRUE, na = "null")
  base::cat(output)
}

tryCatch(
  main(),
  error = function(e) {
    base::message(conditionMessage(e))
    quit(status = 1)
  }
)
