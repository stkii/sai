make_scale_data <- function(n = 50, seed = 11) {
  set.seed(seed)
  t <- rnorm(n)
  data.frame(
    i1 = t + rnorm(n, sd = 0.5),
    i2 = t + rnorm(n, sd = 0.5),
    i3 = t + rnorm(n, sd = 0.5),
    i4 = t + rnorm(n, sd = 0.5)
  )
}

# 独立に実装した α (合計得点の分散に基づく定義式)
alpha_by_total_variance <- function(df) {
  k <- ncol(df)
  (k / (k - 1)) * (1 - sum(vapply(df, var, numeric(1))) / var(rowSums(df)))
}

test_that("Cronbach の α が分散の定義式と一致する", {
  df <- make_scale_data()
  res <- RunReliability(df, list(coefficient = "alpha"))

  # 信頼性統計は統計量を列に取った横一行のテーブル
  summary_tbl <- res$sections[[1]]$table
  expect_equal(unlist(summary_tbl$headers), c("項目数", "Cronbachのアルファ"))
  expect_equal(length(summary_tbl$rows), 1)
  expect_equal(sai_cell_num(summary_tbl$rows[[1]][[1]]), 4)
  expect_equal(
    sai_cell_num(summary_tbl$rows[[1]][[2]]),
    alpha_by_total_variance(df),
    tolerance = 1e-3
  )
})

test_that("未対応の信頼性係数は黙って既定値にせずエラーにする", {
  df <- make_scale_data()
  expect_error(RunReliability(df, list(coefficient = "bogus")), "未対応")
})

test_that("項目削除時 α は当該項目を除いた再計算と一致する", {
  df <- make_scale_data()
  res <- RunReliability(df, list())
  items_tbl <- res$sections[[2]]$table
  expect_equal(sai_col1(items_tbl), colnames(df))
  for (i in seq_len(ncol(df))) {
    expect_equal(
      sai_cell_num(items_tbl$rows[[i]][[2]]),
      alpha_by_total_variance(df[, -i]),
      tolerance = 1e-3
    )
  }
})

test_that("リストワイズ削除が n と注記に反映される", {
  df <- make_scale_data()
  df$i1[1] <- NA
  res <- RunReliability(df, list())
  expect_equal(res$n, 49)
  expect_match(res$n_note, "1件")
})

test_that("項目が1つしかない場合はエラー", {
  expect_error(RunReliability(data.frame(i1 = rnorm(10)), list()), "2つ以上")
})

# ---- McDonald の ω ----

# 独立に実装した ω (base R の factanal による単一因子モデル + 定義式)
omega_by_factanal <- function(df) {
  fit <- factanal(df, factors = 1)
  loadings <- as.vector(fit$loadings[, 1])
  sum(loadings)^2 / (sum(loadings)^2 + sum(fit$uniquenesses))
}

make_congeneric_data <- function(k = 6, n = 250, seed = 3) {
  set.seed(seed)
  f <- rnorm(n)
  df <- as.data.frame(sapply(
    seq_len(k),
    function(i) f * runif(1, 0.5, 1.1) + rnorm(n, sd = runif(1, 0.4, 1.0))
  ))
  colnames(df) <- paste0("i", seq_len(k))
  df
}

test_that("ω が単一因子モデルの定義式と一致する", {
  df <- make_congeneric_data()
  res <- RunReliability(df, list(coefficient = "omega"))

  summary_tbl <- res$sections[[1]]$table
  expect_equal(unlist(summary_tbl$headers), c("項目数", "McDonaldのω"))
  expect_equal(sai_cell_num(summary_tbl$rows[[1]][[1]]), ncol(df))
  expect_equal(
    sai_cell_num(summary_tbl$rows[[1]][[2]]),
    omega_by_factanal(df),
    tolerance = 1e-3
  )
})

test_that("congeneric データでは ω が α を下回らない", {
  df <- make_congeneric_data()
  omega <- sai_cell_num(
    RunReliability(df, list(coefficient = "omega"))$sections[[1]]$table$rows[[1]][[2]]
  )
  alpha <- sai_cell_num(
    RunReliability(df, list(coefficient = "alpha"))$sections[[1]]$table$rows[[1]][[2]]
  )
  expect_gte(omega, alpha)
})

test_that("削除時ω は当該項目を除いた再計算と一致する", {
  df <- make_congeneric_data()
  items_tbl <- RunReliability(df, list(coefficient = "omega"))$sections[[2]]$table
  expect_equal(unlist(items_tbl$headers), c("項目", "削除時ω"))
  expect_equal(sai_col1(items_tbl), colnames(df))
  for (i in seq_len(ncol(df))) {
    expect_equal(
      sai_cell_num(items_tbl$rows[[i]][[2]]),
      omega_by_factanal(df[, -i]),
      tolerance = 1e-3
    )
  }
})

test_that("項目が3つのとき削除時ω は定義できず NA になる", {
  df <- make_congeneric_data(k = 3)
  items_tbl <- RunReliability(df, list(coefficient = "omega"))$sections[[2]]$table
  for (i in seq_len(3)) expect_equal(items_tbl$rows[[i]][[2]], "NA")
})

test_that("ω は項目が3つ未満だとエラー", {
  expect_error(
    RunReliability(make_congeneric_data(k = 2), list(coefficient = "omega")),
    "3つ以上"
  )
})

test_that("ω は観測数が項目数以下だと黙って値を返さずエラー", {
  df <- make_congeneric_data(k = 5, n = 5)
  expect_error(RunReliability(df, list(coefficient = "omega")), "観測が不足")
})

test_that("値が一定の項目は psych の英語エラーではなく明示的にエラーにする", {
  df <- make_congeneric_data(k = 4)
  df$i3 <- 1
  expect_error(RunReliability(df, list(coefficient = "omega")), "値が一定の項目")
})

test_that("負相関の項目を黙って逆転せず、削除時ω が当該項目を名指しする", {
  df <- make_congeneric_data()
  clean <- sai_cell_num(
    RunReliability(df, list(coefficient = "omega"))$sections[[1]]$table$rows[[1]][[2]]
  )

  # i3 の逆転処理を忘れた状態。psych の既定 flip = TRUE はこれを自動逆転し、
  # 逆転処理済みのデータと同一の ω を返して利用者の誤りを不可視化する。
  df$i3 <- -df$i3
  res <- RunReliability(df, list(coefficient = "omega"))
  omega <- sai_cell_num(res$sections[[1]]$table$rows[[1]][[2]])
  expect_lt(omega, clean)

  # 全体を上回る削除時ω は i3 のみ = 外すべき項目として名指しされる
  deleted <- vapply(res$sections[[2]]$table$rows, function(r) sai_cell_num(r[[2]]), numeric(1))
  expect_equal(colnames(df)[deleted > omega], "i3")
})

test_that("係数の指定でラベルと n_note が切り替わる", {
  df <- make_congeneric_data()
  df$i1[1] <- NA
  res <- RunReliability(df, list(coefficient = "omega"))
  expect_equal(unlist(res$sections[[1]]$table$headers), c("項目数", "McDonaldのω"))
  expect_equal(res$n, 249)
  expect_match(res$n_note, "1件")
})
