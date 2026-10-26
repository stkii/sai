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

# 旧実装 (CRAN パッケージ) との突き合わせ用の許容誤差 (相対)。画面に出る有効4桁より
# 十分に厳しく取り、表示の丸めで差が隠れないようにする。
# 閉形式の計算は丸め誤差しか出ないので厳しく、反復解法は収束基準の分だけ緩める。
SAI_TOL_CLOSED <- 1e-9
SAI_TOL_ITERATIVE <- 1e-5

# 比較相手のパッケージは dev profile にだけ置く。本番の環境でも testthat が
# 動くよう、無ければテストを飛ばす。
sai_skip_unless_oracle <- function(pkg) {
  testthat::skip_if_not_installed(pkg)
}

# 突き合わせ用の乱数データ。歪度・尖度が 0 にならないよう指数分布を混ぜ、
# 変数ごとに欠測の位置が変わるようにする。
sai_random_data <- function(n = 60, p = 4, na_rate = 0.1, seed = 1) {
  set.seed(seed)
  df <- as.data.frame(lapply(seq_len(p), function(j) {
    x <- if (j %% 2 == 0) rexp(n) else rnorm(n, mean = j, sd = j)
    x[runif(n) < na_rate] <- NA_real_
    x
  }))
  colnames(df) <- sprintf("v%d", seq_len(p))
  df
}

# 置き換えの PR に書く「旧実装との最大の相対差」を求める。
sai_max_rel_diff <- function(actual, expected) {
  a <- as.numeric(actual)
  e <- as.numeric(expected)
  max(abs(a - e) / pmax(abs(e), .Machine$double.eps), na.rm = TRUE)
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
