# 置き換え前のパッケージとの突き合わせ。.Describe を自前の実装にした後も、
# psych を比較相手に残してこのテストで一致を確かめる。
test_that("記述統計が psych::describe(type = 2) と一致する", {
  sai_skip_unless_oracle("psych")
  stats <- c(
    n = "n", mean = "mean", sd = "sd", median = "median",
    min = "min", max = "max", skewness = "skew", kurtosis = "kurtosis"
  )
  for (n in c(5, 30, 200)) {
    df <- sai_random_data(n = n, seed = n)
    actual <- .Describe(df, include_skewness = TRUE, include_kurtosis = TRUE)
    expected <- suppressWarnings(psych::describe(df, type = 2))
    for (name in names(stats)) {
      a <- vapply(actual, function(s) s[[name]], numeric(1))
      diff <- sai_max_rel_diff(a, expected[[stats[[name]]]])
      expect_lt(diff, SAI_TOL_CLOSED, label = sprintf("%s の最大相対差 (n = %d)", name, n))
    }
  }
})
