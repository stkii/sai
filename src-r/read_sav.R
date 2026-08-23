#!/usr/bin/env Rscript
# SAI R データ読込: SPSS (.sav) ファイルを ParsedTable 互換 JSON へ変換する。
# 使い方: Rscript read_sav.R <input.json> <output.json>
# input.json: { path }
# output.json: { headers: [...], rows: [[...]] } (全セル文字列)

REQUIRED_PACKAGES <- c("jsonlite", "haven")

suppressPackageStartupMessages({
  missing <- REQUIRED_PACKAGES[!vapply(REQUIRED_PACKAGES, requireNamespace, logical(1), quietly = TRUE)]
  if (length(missing) > 0) {
    stop(sprintf("必須パッケージが見つかりません: %s (renv::restore() を実行してください)",
                 paste(missing, collapse = ", ")))
  }
})

args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 2) {
  message("Usage: Rscript read_sav.R <input.json> <output.json>")
  quit(status = 2)
}

input_path <- args[[1]]
output_path <- args[[2]]

script_dir <- dirname(sub("--file=", "", grep("--file=", commandArgs(trailingOnly = FALSE), value = TRUE)[1]))
if (is.na(script_dir) || length(script_dir) == 0 || nchar(script_dir) == 0) {
  script_dir <- getwd()
}
source(file.path(script_dir, "R", "common.R"))

input <- .ReadInputJson(input_path)
sav_path <- input$path
if (is.null(sav_path) || !nzchar(sav_path)) {
  stop("読み込む .sav ファイルのパスが指定されていません")
}

# 値ラベル (例: 1=男, 2=女) は剥がして基底のコード値を保持する。
# ラベル文字列へ置換すると数値系の分析 (記述統計・相関 等) の対象から外れてしまうため。
# ユーザー欠損値は read_spss の既定 (user_na = FALSE) で NA になる。
.SavColToChr <- function(col) {
  col <- haven::zap_labels(col)
  out <- if (inherits(col, "Date") || inherits(col, "POSIXt")) {
    format(col)
  } else if (is.numeric(col)) {
    .NumToChr(col)
  } else {
    as.character(col)
  }
  out[is.na(out)] <- ""
  out
}

df <- tryCatch(
  haven::read_spss(sav_path),
  error = function(e) {
    message(sprintf("SPSS ファイルの読込エラー: %s", conditionMessage(e)))
    quit(status = 1)
  }
)

# 行は名前なしリストにする (名前付きだと JSON がオブジェクトになり、
# Rust 側の Vec<Vec<String>> と互換でなくなる)
cols <- lapply(df, .SavColToChr)
rows <- lapply(seq_len(nrow(df)), function(i) {
  unname(lapply(cols, function(col) col[[i]]))
})

.WriteOutputJson(list(headers = as.list(names(df)), rows = rows), output_path)
