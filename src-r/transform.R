#!/usr/bin/env Rscript
# SAI R 変数作成: データセットへ追加する派生列の値を計算する。
# 使い方: Rscript transform.R <input.json> <output.json>
# input.json: { kind, columns: { <元の列名>: [値...] }, scale_min, scale_max }
# output.json: { columns: { <元の列名>: [値...] }, note?: string }
#
# 出力の列名は入力キー (元の列名) のまま返す。新しい列名の生成と検証は
# Rust 側 (列名の唯一性を守る validate_headers) が担う。

REQUIRED_PACKAGES <- c("jsonlite")

suppressPackageStartupMessages({
  missing <- REQUIRED_PACKAGES[!vapply(REQUIRED_PACKAGES, requireNamespace, logical(1), quietly = TRUE)]
  if (length(missing) > 0) {
    stop(sprintf("必須パッケージが見つかりません: %s (renv::restore() を実行してください)",
                 paste(missing, collapse = ", ")))
  }
})

args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 2) {
  message("Usage: Rscript transform.R <input.json> <output.json>")
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
source(file.path(r_dir, "transform.R"))

input <- .ReadInputJson(input_path)

# 変換の種類。増えた場合はここに分岐を足す。
kind <- if (is.null(input$kind)) "(未指定)" else input$kind

result <- tryCatch(
  {
    if (!identical(kind, "reverse")) {
      stop(sprintf("未対応の変換: %s", kind))
    }
    ReverseItems(input$columns, input$scale_min, input$scale_max)
  },
  error = function(e) {
    message(conditionMessage(e))
    quit(status = 1)
  }
)

# 各列は as.list でくるむ。auto_unbox が長さ1の列をスカラーへ潰すと
# Rust の Vec<String> と互換でなくなるため (1行だけのデータで起きる)。
payload <- list(columns = lapply(result$columns, as.list))
if (!is.null(result$note)) payload$note <- result$note

.WriteOutputJson(payload, output_path)
