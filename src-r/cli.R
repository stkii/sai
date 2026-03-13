#!/usr/bin/env Rscript

.NormalizeKey <- function(key) {
  base::gsub("-", "_", base::tolower(key))
}

.ParseArgs <- function(args) {
  opts <- list()
  i <- 1
  while (i <= length(args)) {
    arg <- args[[i]]
    if (base::startsWith(arg, "--")) {
      # Support both "--key value" and "--key=value".
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
      opts[[.NormalizeKey(key)]] <- value
    }
    i <- i + 1
  }
  opts
}

.ResolveCliValue <- function(opts, key, default = NULL) {
  value <- opts[[key]]
  if (is.null(value) || !base::nzchar(value)) return(default)
  value
}

.GetOptionValue <- function(payload, key) {
  if (is.null(payload) || !is.list(payload)) return(NULL)
  payload[[key]]
}

.GetPayloadValue <- function(payload, keys) {
  if (is.null(keys) || base::length(keys) == 0L) return(NULL)
  for (key in keys) {
    value <- .GetOptionValue(payload, key)
    if (!is.null(value)) return(value)
  }
  NULL
}

.ResolveOption <- function(payload, opts, payload_keys, cli_key, default = NULL) {
  # Payload overrides CLI; empty CLI values are treated as missing.
  value <- .GetPayloadValue(payload, payload_keys)
  if (!is.null(value)) return(value)

  cli_value <- if (is.null(cli_key) || !base::nzchar(cli_key)) NULL else opts[[cli_key]]
  if (!is.null(cli_value) && base::nzchar(cli_value)) return(cli_value)

  default
}

.NormalizeNaIgnore <- function(value) {
  # Accept boolean-like inputs from CLI/payload.
  if (base::is.logical(value)) return(value[[1]])
  base::tolower(base::as.character(value)) %in% c("true", "1", "yes")
}

.NormalizePower <- function(value) {
  # Keep NULL for empty inputs to let downstream defaults apply.
  if (is.null(value) || !base::nzchar(base::as.character(value))) return(NULL)
  value
}

.ResolveOptionsFromSpec <- function(spec, payload, opts) {
  # Resolve only the options declared by the analysis spec.
  resolved <- list()
  option_specs <- spec$options
  if (is.null(option_specs) || base::length(option_specs) == 0L) return(resolved)

  for (opt in option_specs) {
    name <- opt$name
    if (is.null(name) || !base::nzchar(name)) next

    value <- .ResolveOption(payload, opts, opt$payload_keys, opt$cli_key, opt$default)
    if (!is.null(opt$post) && base::is.function(opt$post)) {
      value <- opt$post(value)
    }
    resolved[[name]] <- value
  }

  resolved
}

.ReadJsonPayload <- function(path) {
  if (!requireNamespace("jsonlite", quietly = TRUE)) {
    base::stop("jsonlite is required to parse JSON input")
  }

  if (is.null(path) || !base::nzchar(path) || identical(path, "-")) {
    # "-" or empty path means stdin.
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

.LoadModule <- function(r_dir, file, err_code) {
  path <- base::file.path(r_dir, file)
  if (!base::file.exists(path)) {
    # Keep error codes stable for frontend handling.
    base::stop(base::paste0(err_code, ": R module '", file, "' not found under src-r/R"))
  }
  base::source(path, local = FALSE)
}

.ValidateNumericDataset <- function(df) {
  # CLI-level guard to catch non-numeric inputs early.
  is_numeric_col <- base::vapply(df, function(col) {
    base::is.numeric(col) || base::is.integer(col)
  }, logical(1))
  if (!base::all(is_numeric_col)) {
    StopWithErrCode("ERR-811")
  }
  TRUE
}

.BuildAnalysisSpecs <- function() {
  # Dispatch table: analysis key -> runner + output kind.
  list(
    descriptive = list(
      output_kind = "table",
      requires_numeric = TRUE,
      options = list(
        list(
          name = "order",
          payload_keys = c("order"),
          cli_key = "order",
          default = "default",
          post = base::as.character
        ),
        list(
          name = "na_ignore",
          payload_keys = c("na_ignore", "naIgnore"),
          cli_key = "na_ignore",
          default = "true",
          post = .NormalizeNaIgnore
        )
      ),
      run = function(df, ctx) {
        RunDescriptive(df, order = ctx$order, na_ig = ctx$na_ignore)
      }
    ),
    correlation = list(
      output_kind = "table",
      requires_numeric = TRUE,
      options = list(
        list(name = "method", payload_keys = c("method"), cli_key = "method", default = ""),
        list(name = "use", payload_keys = c("use"), cli_key = "use", default = ""),
        list(name = "alternative", payload_keys = c("alternative"), cli_key = "alternative", default = ""),
        list(name = "view", payload_keys = c("view"), cli_key = "view", default = "")
      ),
      run = function(df, ctx) {
        RunCorrelation(df,
                       method = base::as.character(ctx$method),
                       use = base::as.character(ctx$use),
                       alternative = base::as.character(ctx$alternative),
                       view = base::as.character(ctx$view))
      }
    ),
    reliability = list(
      output_kind = "table",
      requires_numeric = TRUE,
      options = list(
        list(name = "model", payload_keys = c("model"), cli_key = "model", default = "alpha")
      ),
      run = function(df, ctx) {
        RunReliability(df, model = base::as.character(ctx$model))
      }
    ),
    factor = list(
      output_kind = "factor",
      requires_numeric = TRUE,
      options = list(
        list(name = "n_factors", payload_keys = c("n_factors", "nFactors"), cli_key = "n_factors", default = ""),
        list(name = "n_factors_auto", payload_keys = c("n_factors_auto", "nFactorsAuto"), cli_key = "n_factors_auto", default = NULL),
        list(name = "rotation", payload_keys = c("rotation"), cli_key = "rotation", default = ""),
        list(name = "method", payload_keys = c("method"), cli_key = "method", default = ""),
        list(name = "corr_use", payload_keys = c("corr_use", "corrUse", "use"), cli_key = "corr_use", default = ""),
        list(name = "power", payload_keys = c("power"), cli_key = "power", default = "", post = .NormalizePower),
        list(name = "show_scree_plot", payload_keys = c("show_scree_plot", "showScreePlot"), cli_key = NULL, default = NULL)
      ),
      run = function(df, ctx) {
        RunFactor(df,
                  n_factors = ctx$n_factors,
                  n_factors_auto = ctx$n_factors_auto,
                  rotation = base::as.character(ctx$rotation),
                  method = base::as.character(ctx$method),
                  corr_use = base::as.character(ctx$corr_use),
                  power = ctx$power,
                  show_scree_plot = ctx$show_scree_plot)
      }
    ),
    regression = list(
      output_kind = "regression",
      requires_numeric = TRUE,
      options = list(
        list(name = "dependent", payload_keys = c("dependent"), cli_key = NULL, default = NULL),
        list(name = "independent", payload_keys = c("independent"), cli_key = NULL, default = NULL),
        list(name = "interactions", payload_keys = c("interactions"), cli_key = NULL, default = NULL),
        list(name = "intercept", payload_keys = c("intercept"), cli_key = NULL, default = NULL),
        list(name = "center", payload_keys = c("center"), cli_key = NULL, default = NULL)
      ),
      run = function(df, ctx) {
        RunRegression(df,
                      dependent = ctx$dependent,
                      independent = ctx$independent,
                      interactions = ctx$interactions,
                      intercept = ctx$intercept,
                      center = ctx$center)
      }
    ),
    power = list(
      output_kind = "table",
      requires_numeric = FALSE,
      options = list(
        list(name = "effect", payload_keys = c("effect"), cli_key = "effect", default = ""),
        list(name = "test", payload_keys = c("test"), cli_key = "test", default = ""),
        list(name = "sig_level", payload_keys = c("sig_level", "sigLevel"), cli_key = "sig_level", default = 0.05),
        list(name = "power",
             payload_keys = c("power"),
             cli_key = "power",
             default = NULL,
             post = .NormalizePower),
        list(name = "n",
             payload_keys = c("n", "sample_size", "sampleSize"),
             cli_key = "n",
             default = NULL),
        list(name = "t_type", payload_keys = c("t_type", "tType"), cli_key = "t_type", default = ""),
        list(name = "alternative", payload_keys = c("alternative"), cli_key = "alternative", default = ""),
        list(name = "k", payload_keys = c("k"), cli_key = "k", default = NULL),
        list(name = "df", payload_keys = c("df"), cli_key = "df", default = NULL),
        list(name = "u", payload_keys = c("u"), cli_key = "u", default = NULL)
      ),
      run = function(df, ctx) {
        RunPowerTest(effect = ctx$effect,
                     test = ctx$test,
                     sig_level = ctx$sig_level,
                     power = ctx$power,
                     n = ctx$n,
                     t_type = ctx$t_type,
                     alternative = ctx$alternative,
                     k = ctx$k,
                     df = ctx$df,
                     u = ctx$u)
      }
    ),
    anova = list(
      output_kind = "table",
      # ANOVA datasets contain factor (categorical) columns alongside numeric ones,
      # so the numeric-only validation must be skipped.
      requires_numeric = FALSE,
      options = list(
        list(name = "dependent", payload_keys = c("dependent"), cli_key = NULL, default = NULL),
        list(name = "independent", payload_keys = c("independent"), cli_key = NULL, default = NULL),
        list(name = "factors", payload_keys = c("factors"), cli_key = NULL, default = NULL),
        list(name = "covariates", payload_keys = c("covariates"), cli_key = NULL, default = NULL),
        list(name = "interactions", payload_keys = c("interactions"), cli_key = NULL, default = "factor_only")
      ),
      run = function(df, ctx) {
        RunAnova(df,
                 dependent = ctx$dependent,
                 independent = ctx$independent,
                 factors = ctx$factors,
                 covariates = ctx$covariates,
                 interactions = ctx$interactions)
      }
    )
  )
}

.BuildOutputPayload <- function(kind, result) {
  # Normalize output shape for the caller.
  if (identical(kind, "regression")) {
    list(kind = "regression", regression = result)
  } else if (identical(kind, "factor")) {
    list(kind = "factor", factor = result)
  } else {
    list(kind = "table", table = result)
  }
}

Main <- function() {
  args <- commandArgs(trailingOnly = TRUE)
  opts <- .ParseArgs(args)

  script_dir <- {
    # Resolve directory even when invoked via Rscript --file=...
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

  renv_activate <- base::file.path(script_dir, "renv", "activate.R")
  if (base::file.exists(renv_activate)) {
    if (!base::nzchar(Sys.getenv("RENV_PROJECT"))) {
      Sys.setenv(RENV_PROJECT = script_dir)
    }
    base::source(renv_activate, local = FALSE)
  }

  error_path <- base::file.path(r_dir, "error.R")
  if (!base::file.exists(error_path)) {
    base::stop("ERR-999: R core module 'error.R' not found under src-r/R")
  }
  base::source(error_path, local = FALSE)
  .LoadModule(r_dir, "utils.R", "ERR-901")
  .LoadModule(r_dir, "describe.R", "ERR-902")
  .LoadModule(r_dir, "correlation.R", "ERR-903")
  .LoadModule(r_dir, "reliability.R", "ERR-904")
  .LoadModule(r_dir, "centering.R", "ERR-905")
  .LoadModule(r_dir, "regression.R", "ERR-906")
  .LoadModule(r_dir, "common.R", "ERR-908")
  .LoadModule(r_dir, "rotation.R", "ERR-909")
  .LoadModule(r_dir, "factor.R", "ERR-910")
  .LoadModule(r_dir, "power.R", "ERR-911")
  .LoadModule(r_dir, "anova.R", "ERR-912")

  analysis <- .ResolveCliValue(opts, "analysis", "descriptive")
  input_path <- .ResolveCliValue(opts, "input", "-")
  input_format <- base::tolower(.ResolveCliValue(opts, "input_format", "json"))
  options_path <- .ResolveCliValue(opts, "options", "")
  options_payload <- NULL
  if (base::nzchar(options_path)) {
    options_payload <- .ReadJsonPayload(options_path)
  }

  if (!identical(input_format, "json")) {
    base::stop("Only JSON input is supported")
  }

  analysis_specs <- .BuildAnalysisSpecs()
  spec <- analysis_specs[[analysis]]
  resolved_options <- if (is.null(spec)) list() else .ResolveOptionsFromSpec(spec, options_payload, opts)

  if (identical(analysis, "power")) {
    if (is.null(spec)) {
      base::stop("Unsupported analysis type")
    }
    ctx <- resolved_options
    result <- NULL
    utils::capture.output({
      result <- spec$run(NULL, ctx)
    })
    output_payload <- .BuildOutputPayload(spec$output_kind, result)
    output <- jsonlite::toJSON(output_payload, auto_unbox = TRUE, na = "null")
    base::cat(output)
  } else {
    payload <- .ReadJsonPayload(input_path)
    df <- base::as.data.frame(payload, check.names = FALSE, stringsAsFactors = FALSE)
    IsDataFrame(df)
    if (is.null(spec) || isTRUE(spec$requires_numeric)) {
      .ValidateNumericDataset(df)
    }
    if (is.null(spec)) {
      base::stop("Unsupported analysis type")
    }

    ctx <- resolved_options

    result <- spec$run(df, ctx)
    output_payload <- .BuildOutputPayload(spec$output_kind, result)

    output <- jsonlite::toJSON(output_payload, auto_unbox = TRUE, na = "null")
    base::cat(output)
  }

  invisible(NULL)
}

tryCatch(
  Main(),
  error = function(e) {
    base::message(conditionMessage(e))
    quit(status = 1)
  }
)
