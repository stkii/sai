make_reg_data <- function(n = 40, seed = 10) {
  set.seed(seed)
  x1 <- rnorm(n)
  x2 <- rnorm(n)
  x3 <- rnorm(n)
  y <- 1 + 2 * x1 - 1.5 * x2 + 0.5 * x1 * x2 + rnorm(n, sd = 0.5)
  data.frame(y = y, x1 = x1, x2 = x2, x3 = x3)
}

test_that("主効果モデルの係数が lm と一致する", {
  df <- make_reg_data()[, c("y", "x1", "x2")]
  res <- RunRegression(df, list(dependent = "y"))
  fit <- summary(lm(y ~ x1 + x2, df))

  tbl <- res$sections[[1]]$table
  expect_equal(sai_col1(tbl), c("(Intercept)", "x1", "x2"))
  for (i in seq_len(3)) {
    expect_equal(
      sai_cell_num(tbl$rows[[i]][[2]]),
      unname(fit$coefficients[i, 1]),
      tolerance = 1e-3
    )
  }
  # p値セルは .FmtP の整形 (+ 星印) と一致し、指数表記にならない
  expect_identical(
    gsub("\\*+$", "", tbl$rows[[2]][[5]]),
    .FmtP(unname(fit$coefficients[2, 4]))
  )

  # モデル適合度は統計量を列に取った横一行のテーブル
  fit_tbl <- res$sections[[2]]$table
  expect_equal(
    unlist(fit_tbl$headers),
    c("R²", "調整済みR²", "残差標準誤差", "F値", "自由度", "p値")
  )
  expect_equal(length(fit_tbl$rows), 1)
  expect_equal(sai_cell_num(fit_tbl$rows[[1]][[1]]), fit$r.squared, tolerance = 1e-3)

  # モデル全体の p 値は F 分布の上側確率と一致する
  fs <- fit$fstatistic
  model_p <- pf(fs[[1]], fs[[2]], fs[[3]], lower.tail = FALSE)
  expect_identical(gsub("\\*+$", "", fit_tbl$rows[[1]][[6]]), .FmtP(model_p))
})

test_that("指定した交互作用ペアがモデルに投入される", {
  df <- make_reg_data()[, c("y", "x1", "x2")]
  res <- RunRegression(df, list(dependent = "y", interactions = list(list("x1", "x2"))))
  tbl <- res$sections[[1]]$table
  terms <- sai_col1(tbl)
  expect_true("x1 × x2" %in% terms)

  fit <- summary(lm(y ~ x1 + x2 + x1:x2, df))
  i <- which(terms == "x1 × x2")
  expect_equal(
    sai_cell_num(tbl$rows[[i]][[2]]),
    unname(fit$coefficients["x1:x2", 1]),
    tolerance = 1e-3
  )
})

test_that("allInteractions で全ての2次交互作用が投入される", {
  df <- make_reg_data()
  res <- RunRegression(df, list(dependent = "y", allInteractions = TRUE))
  terms <- sai_col1(res$sections[[1]]$table)
  expect_true(all(c("x1 × x2", "x1 × x3", "x2 × x3") %in% terms))
})

test_that("独立変数に含まれない変数の交互作用はエラー", {
  df <- make_reg_data()[, c("y", "x1", "x2")]
  expect_error(
    RunRegression(df, list(dependent = "y", interactions = list(list("x1", "zzz")))),
    "含まれていません"
  )
})

test_that("リストワイズ削除が n と注記に反映される", {
  df <- make_reg_data()[, c("y", "x1", "x2")]
  df$x1[c(1, 2)] <- NA
  res <- RunRegression(df, list(dependent = "y"))
  expect_equal(res$n, 38)
  expect_match(res$n_note, "2件")
})

test_that("目的変数の未指定・不在はエラー", {
  df <- make_reg_data()
  expect_error(RunRegression(df, list()), "指定されていません")
  expect_error(RunRegression(df, list(dependent = "zzz")), "ありません")
})
