test_that("基本統計量が base R と一致する", {
  df <- data.frame(x = c(1, 2, 3, 4, 10), y = c(2, 4, 6, 8, 10))
  res <- RunDescribe(df, list())
  tbl <- res$sections[[1]]$table
  expect_equal(
    unlist(tbl$headers),
    c("変数", "n", "平均", "標準偏差", "最小値", "中央値", "最大値")
  )
  row_x <- tbl$rows[[1]]
  expect_equal(row_x[[1]], "x")
  expect_equal(sai_cell_num(row_x[[2]]), 5)
  expect_equal(sai_cell_num(row_x[[3]]), mean(df$x), tolerance = 1e-3)
  expect_equal(sai_cell_num(row_x[[4]]), sd(df$x), tolerance = 1e-3)
  expect_equal(sai_cell_num(row_x[[5]]), min(df$x), tolerance = 1e-3)
  expect_equal(sai_cell_num(row_x[[6]]), median(df$x), tolerance = 1e-3)
  expect_equal(sai_cell_num(row_x[[7]]), max(df$x), tolerance = 1e-3)
  expect_equal(res$n, 5)
})

test_that("NA は変数ごとに除外され、各行の n に反映される", {
  df <- data.frame(x = c(1, 2, NA, 4), y = c(1, 2, 3, 4))
  res <- RunDescribe(df, list())
  rows <- res$sections[[1]]$table$rows
  expect_equal(sai_cell_num(rows[[1]][[2]]), 3)
  expect_equal(sai_cell_num(rows[[2]][[2]]), 4)
})

test_that("歪度・尖度は options で列が追加される", {
  set.seed(1)
  df <- data.frame(x = rnorm(30))
  res <- RunDescribe(df, list(extras = list(skewness = TRUE, kurtosis = TRUE)))
  expect_true(all(c("歪度", "尖度") %in% unlist(res$sections[[1]]$table$headers)))
})

test_that("mean_desc で平均の降順に並ぶ", {
  df <- data.frame(low = c(1, 2, 3), high = c(10, 11, 12))
  res <- RunDescribe(df, list(sort = "mean_desc"))
  expect_equal(sai_col1(res$sections[[1]]$table), c("high", "low"))
})

test_that("未対応の sort は黙って既定値にせずエラーにする", {
  expect_error(RunDescribe(data.frame(x = 1:3), list(sort = "bogus")), "未対応")
})
