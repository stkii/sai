make_dist_data <- function(n = 15, seed = 3) {
  set.seed(seed)
  data.frame(
    a = rnorm(n, mean = 10, sd = 2),
    b = rnorm(n, mean = 50, sd = 9),
    c = rnorm(n, mean = 0, sd = 1)
  )
}

test_that("各測度が base R の dist と一致する", {
  df <- make_dist_data()
  vars <- t(as.matrix(df))

  expectations <- list(
    list(measure = "euclid", value = as.matrix(dist(vars, method = "euclidean"))),
    list(measure = "seuclid", value = as.matrix(dist(vars, method = "euclidean"))^2),
    list(measure = "chebychev", value = as.matrix(dist(vars, method = "maximum"))),
    list(measure = "block", value = as.matrix(dist(vars, method = "manhattan"))),
    list(measure = "minkowski", value = as.matrix(dist(vars, method = "minkowski", p = 3)))
  )
  for (e in expectations) {
    res <- RunDistance(df, list(measure = e$measure, minkowskiP = 3))
    cell_ab <- res$sections[[1]]$table$rows[[1]][[3]]
    expect_equal(sai_cell_num(cell_ab), e$value[1, 2], tolerance = 1e-3,
                 info = e$measure)
  }
})

test_that("類似度の測度は cor / コサインの定義式と一致し、類似度である旨が注記される", {
  df <- make_dist_data()

  res <- RunDistance(df, list(measure = "correlation"))
  expect_identical(res$sections[[1]]$title, "類似度行列")
  expect_match(res$n_note, "類似度です")
  expect_equal(sai_cell_num(res$sections[[1]]$table$rows[[1]][[3]]),
               cor(df$a, df$b), tolerance = 1e-3)

  res_cos <- RunDistance(df, list(measure = "cosine"))
  expected <- sum(df$a * df$b) / sqrt(sum(df$a^2) * sum(df$b^2))
  expect_equal(sai_cell_num(res_cos$sections[[1]]$table$rows[[1]][[3]]),
               expected, tolerance = 1e-3)
})

test_that("標準化が SPSS PROXIMITIES の定義式と一致する", {
  x <- c(2, 4, 6, 10)
  expect_equal(.StandardizeSeries(x, "z")$values, (x - mean(x)) / sd(x))
  # RANGE は中心化せず範囲で割るだけ
  expect_equal(.StandardizeSeries(x, "range")$values, x / (max(x) - min(x)))
  expect_equal(.StandardizeSeries(x, "rescale")$values, (x - min(x)) / (max(x) - min(x)))
  expect_equal(.StandardizeSeries(x, "max")$values, x / max(x))
  expect_equal(.StandardizeSeries(x, "mean")$values, x / mean(x))
  # SD も中心化しない
  expect_equal(.StandardizeSeries(x, "sd")$values, x / sd(x))
})

test_that("分母が0の系列は SPSS の代替式へ切り替わり、退化が報告される", {
  const <- c(5, 5, 5, 5)
  zero <- c(0, 0, 0, 0)
  neg <- c(-4, -2, -1, 0)

  z <- .StandardizeSeries(const, "z")
  expect_true(z$degenerate)
  expect_equal(z$values, rep(0, 4))

  rescale <- .StandardizeSeries(const, "rescale")
  expect_true(rescale$degenerate)
  expect_equal(rescale$values, rep(0.5, 4))

  rng <- .StandardizeSeries(const, "range")
  expect_true(rng$degenerate)
  expect_equal(rng$values, const)

  sd_res <- .StandardizeSeries(const, "sd")
  expect_true(sd_res$degenerate)
  expect_equal(sd_res$values, const)

  # 最大値が0のときは最小値の絶対値で割って1を足す
  mx <- .StandardizeSeries(neg, "max")
  expect_true(mx$degenerate)
  expect_equal(mx$values, neg / abs(min(neg)) + 1)

  mn <- .StandardizeSeries(zero, "mean")
  expect_true(mn$degenerate)
  expect_equal(mn$values, zero + 1)
})

test_that("退化した系列があると n_note で通知される", {
  df <- make_dist_data()
  df$b <- 7
  res <- RunDistance(df, list(measure = "euclid", standardize = "z"))
  expect_match(res$n_note, "標準化できない変数")
  expect_match(res$n_note, "b")
})

test_that("欠測は dist の自動スケールアップではなくリストワイズ削除で処理される", {
  df <- make_dist_data()
  df$a[c(2, 5)] <- NA
  res <- RunDistance(df, list(measure = "euclid"))

  cc <- df[complete.cases(df), , drop = FALSE]
  expect_equal(res$n, nrow(cc))
  expect_match(res$n_note, "リストワイズ削除により、2件")

  listwise <- as.matrix(dist(t(as.matrix(cc)), method = "euclidean"))[1, 2]
  expect_equal(sai_cell_num(res$sections[[1]]$table$rows[[1]][[3]]),
               listwise, tolerance = 1e-3)

  # dist() に NA 込みで渡した場合の値 (p / n_available 倍のスケールアップ) とは異なる
  scaled_up <- as.matrix(dist(t(as.matrix(df)), method = "euclidean"))[1, 2]
  expect_false(isTRUE(all.equal(listwise, scaled_up, tolerance = 1e-6)))
})

test_that("ケース間距離は元データの行番号でラベル付けされる", {
  df <- make_dist_data(n = 6)
  df$a[3] <- NA
  res <- RunDistance(df, list(between = "cases", measure = "euclid"))
  expect_identical(sai_col1(res$sections[[1]]$table), c("1", "2", "4", "5", "6"))
  expect_match(res$n_note, "元データの行番号")
})

test_that("距離行列は上三角のみ表示される (対角は —, 下三角は空欄)", {
  res <- RunDistance(make_dist_data(), list(measure = "euclid"))
  rows <- res$sections[[1]]$table$rows
  expect_identical(rows[[1]][[2]], "—")
  expect_identical(rows[[2]][[2]], "")
  expect_true(nzchar(rows[[1]][[3]]))
})

test_that("近接行列は指数表記にならず、全セルで小数桁が揃う", {
  decimals <- function(s) {
    parts <- strsplit(s, ".", fixed = TRUE)[[1]]
    if (length(parts) < 2) 0L else nchar(parts[2])
  }
  prox_decimals <- function(measure) {
    res <- RunDistance(make_dist_data(), list(measure = measure))
    cells <- unlist(lapply(res$sections[[1]]$table$rows, function(r) unlist(r)[-1]))
    cells <- cells[nzchar(cells) & cells != "—"]
    expect_false(any(grepl("e[+-]", cells)), info = measure)
    unique(vapply(cells, decimals, integer(1)))
  }
  # seuclid は値が 1e+07 規模になり、有効数字で丸めると指数表記が混ざる
  for (measure in c("euclid", "seuclid", "block", "correlation")) {
    expect_length(prox_decimals(measure), 1)
  }
  # 対角が 1 ちょうどの相関と、誤差で 1 + 1e-16 になるコサインで桁数が揃うこと
  expect_identical(prox_decimals("correlation"), prox_decimals("cosine"))
})

test_that("無効な指定は黙って既定値にせずエラーにする", {
  df <- make_dist_data()
  expect_error(RunDistance(df, list(measure = "bogus")), "未対応の測度")
  expect_error(RunDistance(df, list(standardize = "all.obs")), "未対応の標準化")
  expect_error(RunDistance(df, list(between = "rows")), "未対応の計算対象")
  expect_error(RunDistance(df, list(standardizeBy = "column")), "未対応の標準化の適用単位")
  expect_error(RunDistance(df, list(measure = "minkowski", minkowskiP = 0)), "正の数")
})

test_that("options の読み出しは接頭辞の部分マッチを起こさない", {
  # R の `$` はリストに部分マッチするため、standardize が未指定でも
  # standardizeBy の値を拾ってしまう。`[[` の完全一致で読むことの回帰テスト
  df <- make_dist_data()
  res <- RunDistance(df, list(measure = "euclid", standardizeBy = "case"))
  expect_null(res$n_note)
  expect_equal(
    sai_cell_num(res$sections[[1]]$table$rows[[1]][[3]]),
    as.matrix(dist(t(as.matrix(df))))[1, 2],
    tolerance = 1e-3
  )
})

test_that("変数が1つしかない場合はエラー", {
  expect_error(RunDistance(data.frame(a = 1:5), list()), "2つ以上")
})
