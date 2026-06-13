# EFAtools は実行時に情報メッセージ・警告を出すことがあるため抑制して呼ぶ
run_factor_quietly <- function(df, options) {
  suppressMessages(suppressWarnings(RunFactor(df, options)))
}

base_options <- list(
  method = "PAF",
  nfactorsMode = "fixed",
  nfactors = 2,
  rotation = "varimax",
  na = "complete.obs",
  sortByFactor = FALSE
)

test_that("既知の2因子構造を復元する (listwise)", {
  df <- sai_factor_data()
  res <- run_factor_quietly(df, base_options)

  tbl <- res$sections[[1]]$table
  expect_equal(unlist(tbl$headers), c("変数", "F1", "F2"))

  load <- t(vapply(
    tbl$rows,
    function(r) c(sai_cell_num(r[[2]]), sai_cell_num(r[[3]])),
    numeric(2)
  ))
  rownames(load) <- sai_col1(tbl)

  primary <- apply(abs(load), 1, which.max)
  expect_true(all(primary[c("v1", "v2", "v3")] == primary[["v1"]]))
  expect_true(all(primary[c("v4", "v5", "v6")] == primary[["v4"]]))
  expect_false(primary[["v1"]] == primary[["v4"]])
  expect_true(all(apply(abs(load), 1, max) > 0.5))
  expect_equal(res$n, nrow(df))
})

test_that("guttman モードは固有値>1 の因子数を選ぶ", {
  df <- sai_factor_data()
  opts <- modifyList(base_options, list(nfactorsMode = "guttman"))
  res <- run_factor_quietly(df, opts)
  # 解決された因子数は負荷量テーブルの因子列 (F1, F2, ...) で確認する
  expect_equal(unlist(res$sections[[1]]$table$headers), c("変数", "F1", "F2"))
})

test_that("pairwise: 全行が n に保持され、注記が付く", {
  df <- sai_factor_data()
  df$v1[c(3, 8)] <- NA
  df$v6[15] <- NA
  opts <- modifyList(base_options, list(na = "pairwise.complete.obs"))
  res <- run_factor_quietly(df, opts)
  expect_equal(res$n, nrow(df))
  expect_match(res$n_note, "ペアワイズ")
})

test_that("listwise: 欠測行が除外され注記が付く", {
  df <- sai_factor_data()
  df$v1[c(3, 8)] <- NA
  res <- run_factor_quietly(df, base_options)
  expect_equal(res$n, nrow(df) - 2)
  expect_match(res$n_note, "2件")
})

test_that("promax では構造行列と因子間相関が出力される", {
  df <- sai_factor_data()
  opts <- modifyList(base_options, list(rotation = "promax"))
  res <- run_factor_quietly(df, opts)
  titles <- vapply(res$sections, function(s) s$title, character(1))
  expect_true(any(grepl("パターン行列", titles)))
  expect_true("構造行列" %in% titles)
  expect_true("因子間相関" %in% titles)
})

# 表示テーブルから負荷量行列を復元する (行 = 変数、列 = 因子)
factor_table_matrix <- function(table) {
  k <- length(table$headers) - 1
  t(vapply(
    table$rows,
    function(r) vapply(seq_len(k) + 1, function(j) sai_cell_num(r[[j]]), numeric(1)),
    numeric(k)
  ))
}

factor_section <- function(res, title) {
  for (s in res$sections) if (s$title == title) return(s)
  stop(sprintf("セクションが見つかりません: %s", title))
}

test_that("因子寄与 (varimax) は負荷量平方和・寄与率・累積寄与率を出す", {
  df <- sai_factor_data()
  res <- run_factor_quietly(df, base_options)
  tbl <- factor_section(res, "因子寄与")$table

  expect_equal(sai_col1(tbl), c("負荷量平方和", "寄与率", "累積寄与率"))

  # 直交回転では負荷量平方和 = 因子行列の列ごとの二乗和 (定義式)
  load <- factor_table_matrix(factor_section(res, "因子行列")$table)
  ss <- vapply(2:3, function(j) sai_cell_num(tbl$rows[[1]][[j]]), numeric(1))
  expect_equal(ss, unname(colSums(load^2)), tolerance = 1e-2)

  prop <- vapply(2:3, function(j) sai_cell_num(tbl$rows[[2]][[j]]), numeric(1))
  cum <- vapply(2:3, function(j) sai_cell_num(tbl$rows[[3]][[j]]), numeric(1))
  expect_equal(prop, ss / ncol(df), tolerance = 1e-2)
  expect_equal(cum, cumsum(prop), tolerance = 1e-2)
})

test_that("因子寄与 (promax) は因子間相関を考慮し、寄与率を出さない", {
  # 因子間相関が明確に出るよう、共通成分 g を持つ 2 因子データを使う
  set.seed(7)
  n <- 300
  g <- rnorm(n)
  f1 <- g + rnorm(n, sd = 0.8)
  f2 <- g + rnorm(n, sd = 0.8)
  df <- data.frame(
    v1 = 0.8 * f1 + rnorm(n, sd = 0.4),
    v2 = 0.75 * f1 + rnorm(n, sd = 0.4),
    v3 = 0.7 * f1 + rnorm(n, sd = 0.4),
    v4 = 0.8 * f2 + rnorm(n, sd = 0.4),
    v5 = 0.75 * f2 + rnorm(n, sd = 0.4),
    v6 = 0.7 * f2 + rnorm(n, sd = 0.4)
  )
  opts <- modifyList(base_options, list(rotation = "promax"))
  res <- run_factor_quietly(df, opts)
  tbl <- factor_section(res, "因子寄与")$table

  # SPSS と同じく、斜交回転では負荷量平方和のみ + 加算不可の注記
  expect_equal(sai_col1(tbl), "負荷量平方和")
  expect_match(tbl$note, "加算")

  # 斜交の負荷量平方和の定義式: diag(t(L) %*% L %*% Phi)
  pattern <- factor_table_matrix(factor_section(res, "パターン行列")$table)
  phi <- factor_table_matrix(factor_section(res, "因子間相関")$table)
  expected <- diag(t(pattern) %*% pattern %*% phi)
  ss <- vapply(2:3, function(j) sai_cell_num(tbl$rows[[1]][[j]]), numeric(1))
  expect_equal(ss, unname(expected), tolerance = 1e-2)

  # パターン行列の単純な二乗和 (旧実装) とは一致しないことも確認する
  expect_gt(max(abs(ss - colSums(pattern^2))), 0.05)
})

test_that("無効な指定は黙って既定値にせずエラーにする", {
  df <- sai_factor_data()
  expect_error(run_factor_quietly(df, modifyList(base_options, list(na = "all.obs"))), "未対応")
  expect_error(run_factor_quietly(df, modifyList(base_options, list(rotation = "oblimin"))), "未対応")
  expect_error(run_factor_quietly(df, modifyList(base_options, list(method = "MINRES"))), "未対応")
})
