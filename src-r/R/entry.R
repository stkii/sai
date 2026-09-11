# Rust から Rscript で起動されるエントリ (cli.R / transform.R / read_sav.R) の共通処理。
# script_dir の解決だけは source() より前に必要なため各スクリプトに残る。

# 必須パッケージの存在確認。自動インストールはしない (renv の lockfile と実環境を
# silent に乖離させないため)。各メソッドは個別のチェックを持たず `pkg::fn()` で呼ぶ。
.RequirePackages <- function(pkgs) {
  suppressPackageStartupMessages({
    missing <- pkgs[!vapply(pkgs, requireNamespace, logical(1), quietly = TRUE)]
    if (length(missing) > 0) {
      stop(sprintf("必須パッケージが見つかりません: %s (renv::restore() を実行してください)",
                   paste(missing, collapse = ", ")))
    }
  })
}

# `<input.json> <output.json>` の受け渡し規約。足りなければ使い方を出して終了する。
.EntryPaths <- function(usage) {
  args <- commandArgs(trailingOnly = TRUE)
  if (length(args) < 2) {
    message(usage)
    quit(status = 2)
  }
  list(input = args[[1]], output = args[[2]])
}
