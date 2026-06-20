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
  expect_error(RunReliability(df, list(coefficient = "omega")), "未対応")
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
