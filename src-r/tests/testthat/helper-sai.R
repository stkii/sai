# testthat が自動で source するヘルパ。
# テスト実行時の wd は tests/testthat/ になるため、cli.R を目印に
# src-r ルートを解決し、R/ 配下の実装を読み込む。

sai_root <- local({
  d <- normalizePath(getwd())
  while (!file.exists(file.path(d, "cli.R"))) {
    parent <- dirname(d)
    if (identical(parent, d)) stop("src-r ルート (cli.R) が見つかりません")
    d <- parent
  }
  d
})

for (f in list.files(file.path(sai_root, "R"), pattern = "\\.R$", full.names = TRUE)) {
  source(f)
}

# 表示用セル ("0.5**", "**0.83**", " 2.37" 等) から数値を取り出す
sai_cell_num <- function(cell) {
  as.numeric(gsub("[*\\s]", "", cell, perl = TRUE))
}

# table の第1列 (変数名・項ラベル) を文字ベクトルで取り出す
sai_col1 <- function(table) {
  vapply(table$rows, function(r) as.character(r[[1]]), character(1))
}

# 既知の2因子構造を持つテストデータ (v1-v3 <- F1 / v4-v6 <- F2)。
# .GuttmanNfactors の Ledermann 上限 (p=4 だと最大1因子) を超えられるよう
# 6変数にしている。
sai_factor_data <- function(n = 200, seed = 42) {
  set.seed(seed)
  f1 <- rnorm(n)
  f2 <- rnorm(n)
  data.frame(
    v1 = 0.8 * f1 + rnorm(n, sd = 0.4),
    v2 = 0.75 * f1 + rnorm(n, sd = 0.4),
    v3 = 0.7 * f1 + rnorm(n, sd = 0.4),
    v4 = 0.8 * f2 + rnorm(n, sd = 0.4),
    v5 = 0.75 * f2 + rnorm(n, sd = 0.4),
    v6 = 0.7 * f2 + rnorm(n, sd = 0.4)
  )
}

# cli.R を本物の Rscript サブプロセスで実行する (E2E)。
# fixture には tests/fixtures/cli/ 配下のファイル名、input には R オブジェクトを渡す。
sai_run_cli <- function(input = NULL, fixture = NULL) {
  in_path <- if (!is.null(fixture)) {
    file.path(sai_root, "tests", "fixtures", "cli", fixture)
  } else {
    p <- tempfile(fileext = ".json")
    jsonlite::write_json(input, p, auto_unbox = TRUE)
    p
  }
  out_path <- tempfile(fileext = ".json")
  owd <- setwd(sai_root)
  on.exit(setwd(owd), add = TRUE)
  log <- suppressWarnings(system2(
    "Rscript",
    c("--no-save", "--no-restore", "cli.R", shQuote(in_path), shQuote(out_path)),
    stdout = TRUE, stderr = TRUE
  ))
  status <- attr(log, "status")
  list(
    status = if (is.null(status)) 0L else status,
    log = paste(log, collapse = "\n"),
    result = if (file.exists(out_path)) jsonlite::fromJSON(out_path, simplifyVector = FALSE) else NULL
  )
}
