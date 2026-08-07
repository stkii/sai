#!/usr/bin/env Rscript
# SAI R CLI: Rust から Rscript で呼び出されるエントリポイント。
# 使い方: Rscript cli.R <input.json> <output.json>
# input.json: { method, headers, rows, options }
# output.json: { sections: [...], n?: number, n_note?: string }

# 必須サードパーティパッケージ。renv で管理されている前提で、起動時に一括
# requireNamespace で存在確認し、不足があれば fail-fast で停止する。
# 自動インストールは行わない (renv の lockfile と実環境を silent に乖離させ
# ないため)。各メソッド側では個別の requireNamespace チェックを持たず、
# 利用は `pkg::fn()` の namespaced 呼び出しで統一する。
REQUIRED_PACKAGES <- c("jsonlite", "EFAtools", "psych")

suppressPackageStartupMessages({
  missing <- REQUIRED_PACKAGES[!vapply(REQUIRED_PACKAGES, requireNamespace, logical(1), quietly = TRUE)]
  if (length(missing) > 0) {
    stop(sprintf("必須パッケージが見つかりません: %s (renv::restore() を実行してください)",
                 paste(missing, collapse = ", ")))
  }
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
  describe    = list(requires_data = TRUE,  data_shape = "all_numeric",          run = RunDescribe),
  correlation = list(requires_data = TRUE,  data_shape = "all_numeric",          run = RunCorrelation),
  regression  = list(requires_data = TRUE,  data_shape = "all_numeric",          run = RunRegression),
  reliability = list(requires_data = TRUE,  data_shape = "all_numeric",          run = RunReliability),
  factor      = list(requires_data = TRUE,  data_shape = "all_numeric",          run = RunFactor),
  anova       = list(requires_data = TRUE,  data_shape = "numeric_with_factors", run = RunAnova),
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

.WriteOutputJson(payload, output_path)
