#!/usr/bin/env Rscript
# SAI R CLI: Rust から Rscript で呼び出されるエントリポイント。
# 使い方: Rscript cli.R <input.json> <output.json>
# input.json: { method, headers, rows, options }
# output.json: { sections: [...], n?: number, n_note?: string }

script_dir <- dirname(sub("--file=", "", grep("--file=", commandArgs(trailingOnly = FALSE), value = TRUE)[1]))
if (is.na(script_dir) || length(script_dir) == 0 || nchar(script_dir) == 0) {
  script_dir <- getwd()
}
r_dir <- file.path(script_dir, "R")
source(file.path(r_dir, "entry.R"))

.RequirePackages(c("jsonlite", "EFAtools", "psych", "smacof"))
paths <- .EntryPaths("Usage: Rscript cli.R <input.json> <output.json>")

source(file.path(r_dir, "common.R"))
source(file.path(r_dir, "describe.R"))
source(file.path(r_dir, "correlation.R"))
source(file.path(r_dir, "regression.R"))
source(file.path(r_dir, "reliability.R"))
source(file.path(r_dir, "factor.R"))
source(file.path(r_dir, "anova.R"))
source(file.path(r_dir, "power.R"))
# mds.R は distance.R の .DistanceMatrix を使うため後に読む
source(file.path(r_dir, "distance.R"))
source(file.path(r_dir, "mds.R"))

input <- .ReadInputJson(paths$input)

method <- input$method
headers <- unlist(input$headers)
rows <- .RowsFromTable(input$rows)
options <- if (is.null(input$options)) list() else input$options

dispatch <- list(
  describe    = list(requires_data = TRUE,  data_shape = "all_numeric",          run = RunDescribe),
  correlation = list(requires_data = TRUE,  data_shape = "all_numeric",          run = RunCorrelation),
  regression  = list(requires_data = TRUE,  data_shape = "all_numeric",          run = RunRegression),
  reliability = list(requires_data = TRUE,  data_shape = "all_numeric",          run = RunReliability),
  factor      = list(requires_data = TRUE,  data_shape = "all_numeric",          run = RunFactor),
  anova       = list(requires_data = TRUE,  data_shape = "numeric_with_factors", run = RunAnova),
  distance    = list(requires_data = TRUE,  data_shape = "all_numeric",          run = RunDistance),
  mds         = list(requires_data = TRUE,  data_shape = "all_numeric",          run = RunMds),
  power       = list(requires_data = FALSE, data_shape = "none",                 run = RunPower)
)

spec <- dispatch[[method]]
if (is.null(spec)) {
  stop(sprintf("未対応の分析メソッド: %s", method))
}

df <- if (!isTRUE(spec$requires_data)) {
  data.frame()
} else if (spec$data_shape == "all_numeric") {
  .AsNumericDf(rows, headers)
} else if (spec$data_shape == "numeric_with_factors") {
  .AsMixedDf(rows, headers)
} else {
  stop(sprintf("未対応のデータ形状: %s", spec$data_shape))
}

coercion_note <- .CoercionNote(attr(df, "coerced_counts"))

# 数値化の失敗は「有効な観測が不足」等のエラーの真因になりうるため、
# 失敗した場合もエラーメッセージに添えて原因の誤診を防ぐ
result <- tryCatch(
  spec$run(df, options),
  error = function(e) {
    message(.MergeNotes(sprintf("R 実行エラー: %s", conditionMessage(e)), coercion_note))
    quit(status = 1)
  }
)

payload <- list(
  sections = result$sections
)
if (!is.null(result$n)) payload$n <- result$n
# 数値化に失敗した値がある場合は、メソッド側の注記と合わせて必ず通知する
n_note <- .MergeNotes(result$n_note, coercion_note)
if (!is.null(n_note)) payload$n_note <- n_note

.WriteOutputJson(payload, paths$output)
