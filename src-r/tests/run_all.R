#!/usr/bin/env Rscript
# 分析メソッドのテストを一括実行する。
#
# CLI から (src-r/ で):  RENV_PROFILE=dev Rscript tests/run_all.R
# RStudio から:          testthat::test_dir("tests/testthat")
#                        (dev profile で起動しておくこと。個別実行は testthat::test_file)
#
# 初回セットアップ:      RENV_PROFILE=dev Rscript -e 'renv::restore()'

if (!requireNamespace("testthat", quietly = TRUE)) {
  stop(paste0(
    "testthat が見つかりません。テストは dev profile で実行してください:\n",
    "  RENV_PROFILE=dev Rscript tests/run_all.R\n",
    "初回は RENV_PROFILE=dev Rscript -e 'renv::restore()' で環境を構築します (CLAUDE.md 参照)"
  ))
}

# スクリプト位置から src-r ルートを解決し、実行時の wd に依存しないようにする
args <- commandArgs(trailingOnly = FALSE)
file_arg <- grep("--file=", args, value = TRUE)
script_dir <- if (length(file_arg) > 0) dirname(sub("--file=", "", file_arg[1])) else "tests"
root <- normalizePath(file.path(script_dir, ".."))

testthat::test_dir(file.path(root, "tests", "testthat"), stop_on_failure = TRUE)
