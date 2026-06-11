make_corr_data <- function(n = 30, seed = 7) {
  set.seed(seed)
  a <- rnorm(n)
  data.frame(
    a = a,
    b = 0.8 * a + rnorm(n, sd = 0.3),
    c = rnorm(n)
  )
}

test_that("listwise: r と p が同一の complete cases から計算される", {
  df <- make_corr_data()
  df$a[c(2, 5, 11)] <- NA
  res <- RunCorrelation(df, list(method = "pearson", na = "complete.obs"))
  cc <- df[complete.cases(df), ]
  expect_equal(res$n, nrow(cc))
  expect_match(res$n_note, "リストワイズ削除により、3件")

  cell_ab <- res$sections[[1]]$table$rows[[1]][[3]]
  expect_equal(sai_cell_num(cell_ab), cor(cc$a, cc$b), tolerance = 1e-3)

  # 星 (有意水準) も同一サンプルの cor.test と対応していること
  p <- cor.test(cc$a, cc$b)$p.value
  stars <- gsub("[^*]", "", cell_ab)
  expected <- if (p < 0.001) "***" else if (p < 0.01) "**" else if (p < 0.05) "*" else ""
  expect_equal(stars, expected)
})

test_that("pairwise: r はペアごとの観測から計算され、注記が付く", {
  df <- make_corr_data(seed = 8)
  df$a[1:3] <- NA
  df$c[10] <- NA
  res <- RunCorrelation(df, list(method = "pearson", na = "pairwise.complete.obs"))
  expect_equal(res$n, nrow(df))
  expect_match(res$n_note, "ペアワイズ")

  ok <- complete.cases(df$b, df$c)
  cell_bc <- res$sections[[1]]$table$rows[[2]][[4]]
  expect_equal(sai_cell_num(cell_bc), cor(df$b[ok], df$c[ok]), tolerance = 1e-3)
})

test_that("相関行列は上三角のみ表示される (対角は —, 下三角は空欄)", {
  df <- make_corr_data()
  res <- RunCorrelation(df, list(method = "pearson", na = "complete.obs"))
  rows <- res$sections[[1]]$table$rows
  expect_identical(rows[[1]][[2]], "—") # 対角 (a×a)
  expect_identical(rows[[2]][[2]], "") # 下三角 (b×a)
  expect_true(nzchar(rows[[1]][[3]])) # 上三角 (a×b) には係数が入る
})

test_that("spearman / kendall も base R と一致する", {
  df <- make_corr_data(n = 20, seed = 9)[, c("a", "b")]
  for (m in c("spearman", "kendall")) {
    res <- RunCorrelation(df, list(method = m, na = "complete.obs"))
    expect_equal(
      sai_cell_num(res$sections[[1]]$table$rows[[1]][[3]]),
      cor(df$a, df$b, method = m),
      tolerance = 1e-3
    )
  }
})

test_that("無効な指定は黙って既定値にせずエラーにする", {
  df <- make_corr_data(n = 10)
  expect_error(RunCorrelation(df, list(na = "all.obs")), "未対応")
  expect_error(RunCorrelation(df, list(method = "bogus")), "未対応")
})

test_that("変数が1つしかない場合はエラー", {
  expect_error(RunCorrelation(data.frame(a = 1:5), list()), "2つ以上")
})
