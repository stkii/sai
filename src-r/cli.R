#!/usr/bin/env Rscript
# SAI R CLI: Rust から Rscript で呼び出されるエントリポイント。
# 使い方: Rscript cli.R <input.json> <output.json>
# input.json: { method, headers, rows, options }
# output.json: { sections: [...], n?: number, n_note?: string }

suppressPackageStartupMessages({
  if (!requireNamespace("jsonlite", quietly = TRUE)) {
    install.packages("jsonlite", repos = "https://cloud.r-project.org", quiet = TRUE)
  }
  library(jsonlite)
})

args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 2) {
  message("Usage: Rscript cli.R <input.json> <output.json>")
  quit(status = 2)
}

input_path <- args[[1]]
output_path <- args[[2]]

script_dir <- dirname(sub("--file=", "", grep("--file=", commandArgs(trailingOnly = FALSE), value = TRUE)[1]))
if (is.na(script_dir) || length(script_dir) == 0 || nchar(script_dir) == 0) {
  script_dir <- getwd()
}
r_dir <- file.path(script_dir, "R")

source(file.path(r_dir, "common.R"))
source(file.path(r_dir, "describe.R"))
source(file.path(r_dir, "correlation.R"))
source(file.path(r_dir, "regression.R"))
source(file.path(r_dir, "reliability.R"))
source(file.path(r_dir, "factor.R"))
source(file.path(r_dir, "anova.R"))
source(file.path(r_dir, "power.R"))

input <- .ReadInputJson(input_path)

method <- input$method
headers <- unlist(input$headers)
rows <- .RowsFromTable(input$rows)
options <- if (is.null(input$options)) list() else input$options

dispatch <- list(
  describe    = list(requires_data = TRUE,  kind = "numeric", run = RunDescribe),
  correlation = list(requires_data = TRUE,  kind = "numeric", run = RunCorrelation),
  regression  = list(requires_data = TRUE,  kind = "numeric", run = RunRegression),
  reliability = list(requires_data = TRUE,  kind = "numeric", run = RunReliability),
  factor      = list(requires_data = TRUE,  kind = "numeric", run = RunFactor),
  anova       = list(requires_data = TRUE,  kind = "mixed",   run = RunAnova),
  power       = list(requires_data = FALSE, kind = "none",    run = RunPower)
)

spec <- dispatch[[method]]
if (is.null(spec)) {
  stop(sprintf("未対応の分析メソッド: %s", method))
}

df <- if (!isTRUE(spec$requires_data)) {
  data.frame()
} else if (spec$kind == "numeric") {
  .AsNumericDf(rows, headers)
} else if (spec$kind == "mixed") {
  .AsMixedDf(rows, headers)
} else {
  stop(sprintf("未対応のデータ種別: %s", spec$kind))
}

result <- tryCatch(
  spec$run(df, options),
  error = function(e) {
    message(sprintf("R 実行エラー: %s", conditionMessage(e)))
    quit(status = 1)
  }
)

payload <- list(
  sections = result$sections
)
if (!is.null(result$n)) payload$n <- result$n
if (!is.null(result$n_note)) payload$n_note <- result$n_note

.WriteOutputJson(payload, output_path)
