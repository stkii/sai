# 既知の2次元布置から作った距離行列。ユークリッド埋め込み可能なので
# ratio MDS のストレスはほぼ0になるはず。
sai_mds_matrix <- function(n = 9, seed = 11) {
  set.seed(seed)
  pts <- matrix(rnorm(n * 2), n, 2)
  d <- as.matrix(dist(pts))
  df <- as.data.frame(d)
  colnames(df) <- sprintf("s%d", seq_len(n))
  df
}

test_that("ratio MDS のストレスが smacof の生出力と一致する", {
  df <- sai_mds_matrix()
  res <- RunMds(df, list(source = "matrix", type = "ratio", ndim = 2))

  expected <- smacof::mds(as.matrix(df), ndim = 2, type = "ratio",
                          ties = "secondary", init = "torgerson", principal = TRUE)
  fit <- res$sections[[2]]$table$rows
  expect_equal(sai_cell_num(fit[[2]][[2]]), expected$stress, tolerance = 1e-4)
})

test_that("適合度の各指標が正規化された生ストレスから導かれる関係を満たす", {
  df <- sai_mds_matrix(n = 12, seed = 5)
  res <- RunMds(df, list(source = "matrix", type = "interval", ndim = 2))
  fit <- res$sections[[2]]$table$rows

  labels <- vapply(fit, function(r) as.character(r[[1]]), character(1))
  expect_identical(labels, c("正規化された生ストレス", "Stress-I",
                             "分散説明率 (D.A.F.)", "Tucker の一致係数", "反復回数"))

  raw <- sai_cell_num(fit[[1]][[2]])
  stress1 <- sai_cell_num(fit[[2]][[2]])
  daf <- sai_cell_num(fit[[3]][[2]])
  tucker <- sai_cell_num(fit[[4]][[2]])

  expect_equal(raw, stress1^2, tolerance = 1e-3)
  expect_equal(daf, 1 - raw, tolerance = 1e-3)
  expect_equal(tucker, sqrt(daf), tolerance = 1e-3)
})

test_that("ユークリッド埋め込み可能な距離行列はストレスがほぼ0になる", {
  df <- sai_mds_matrix(n = 10, seed = 21)
  res <- RunMds(df, list(source = "matrix", type = "ratio", ndim = 2))
  stress1 <- sai_cell_num(res$sections[[2]]$table$rows[[2]][[2]])
  expect_lt(stress1, 0.01)
})

test_that("布置座標は対象ごとに次元数ぶんの列を持つ", {
  df <- sai_mds_matrix(n = 8)
  res <- RunMds(df, list(source = "matrix", type = "ratio", ndim = 3))
  tbl <- res$sections[[1]]$table
  expect_identical(tbl$headers, c("対象", "次元1", "次元2", "次元3"))
  expect_length(tbl$rows, 8)
  expect_identical(sai_col1(tbl), sprintf("s%d", 1:8))
})

test_that("非対称な非類似度行列は両三角の平均を取り、その事実が注記される", {
  df <- sai_mds_matrix(n = 8)
  df[1, 2] <- df[1, 2] + 3
  res <- RunMds(df, list(source = "matrix", type = "ratio", ndim = 2))
  expect_match(res$n_note, "非対称")
  expect_match(res$n_note, "平均")
})

test_that("対称な行列では対称化の注記が出ない", {
  res <- RunMds(sai_mds_matrix(n = 8), list(source = "matrix", type = "ratio", ndim = 2))
  expect_false(grepl("非対称", res$n_note))
})

test_that("生データからの MDS はリストワイズ削除され、注記される", {
  set.seed(31)
  df <- data.frame(a = rnorm(20), b = rnorm(20), c = rnorm(20), d = rnorm(20))
  df$a[c(3, 7)] <- NA
  res <- RunMds(df, list(source = "raw", between = "variables",
                         measure = "euclid", type = "ratio", ndim = 2))
  expect_equal(res$n, 18)
  expect_match(res$n_note, "リストワイズ削除により、2件")
  expect_identical(sai_col1(res$sections[[1]]$table), c("a", "b", "c", "d"))
})

test_that("類似度の測度は符号反転で非類似度へ変換され、その事実が注記される", {
  set.seed(41)
  df <- data.frame(a = rnorm(30), b = rnorm(30), c = rnorm(30),
                   d = rnorm(30), e = rnorm(30))
  res <- RunMds(df, list(source = "raw", between = "variables",
                         measure = "correlation", type = "ratio", ndim = 2))
  expect_match(res$n_note, "非類似度に変換")

  sim <- cor(df)
  expected <- max(sim[upper.tri(sim)]) - sim
  diag(expected) <- 0
  expect_equal(.SimilarityToDissimilarity(sim), expected)
  expect_true(all(.SimilarityToDissimilarity(sim) >= 0))
})

test_that("対象の数が次元数に対して少ないと注記される", {
  df <- sai_mds_matrix(n = 6)
  res <- RunMds(df, list(source = "matrix", type = "ratio", ndim = 2))
  expect_match(res$n_note, "4倍")

  enough <- sai_mds_matrix(n = 10)
  res2 <- RunMds(enough, list(source = "matrix", type = "ratio", ndim = 2))
  expect_false(grepl("4倍", res2$n_note))
})

test_that("順序変換では局所解の可能性が注記される", {
  df <- sai_mds_matrix(n = 10)
  res <- RunMds(df, list(source = "matrix", type = "ordinal",
                         ties = "secondary", ndim = 2))
  expect_match(res$n_note, "局所解")
})

test_that("非類似度行列の形が不正な場合はエラーにする", {
  df <- sai_mds_matrix(n = 8)

  expect_error(RunMds(df[, 1:4], list(source = "matrix")), "行数と列数")
  expect_error(RunMds(df, list(source = "matrix", ndim = 8)), "対象の数")

  neg <- df
  neg[1, 2] <- -1
  expect_error(RunMds(neg, list(source = "matrix")), "負の値")

  na_df <- df
  na_df[1, 2] <- NA
  expect_error(RunMds(na_df, list(source = "matrix")), "欠測")

  small <- sai_mds_matrix(n = 2)
  expect_error(RunMds(small, list(source = "matrix")), "3つ以上")
})

test_that("eurodist の2次元布置が元の道路距離を再現する", {
  # 欧州21都市間の道路距離。2次元の布置が地図上の位置関係を復元することが知られている
  m <- as.matrix(datasets::eurodist)
  res <- RunMds(as.data.frame(m), list(source = "matrix", type = "ratio", ndim = 2))

  tbl <- res$sections[[1]]$table
  expect_length(tbl$rows, 21)
  expect_identical(sai_col1(tbl)[1:3], c("Athens", "Barcelona", "Brussels"))

  coords <- t(vapply(tbl$rows, function(r) {
    c(sai_cell_num(r[[2]]), sai_cell_num(r[[3]]))
  }, numeric(2)))
  # 布置から測り直した距離は回転・鏡映に依らないので、元の距離と直接比べられる
  expect_gt(cor(as.vector(dist(coords)), as.vector(as.dist(m))), 0.99)

  stress1 <- sai_cell_num(res$sections[[2]]$table$rows[[2]][[2]])
  expect_lt(stress1, 0.12)
})

test_that("無効な指定は黙って既定値にせずエラーにする", {
  df <- sai_mds_matrix(n = 8)
  expect_error(RunMds(df, list(source = "wide")), "未対応のデータ形式")
  expect_error(RunMds(df, list(source = "matrix", type = "mspline")), "未対応の変換")
  expect_error(RunMds(df, list(source = "matrix", ties = "none")), "未対応の同順位の扱い")
  expect_error(RunMds(df, list(source = "matrix", ndim = 0)), "1以上")
})
