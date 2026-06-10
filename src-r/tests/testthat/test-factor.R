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
  expect_match(res$sections[[1]]$title, "固有値>1により2因子")
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

test_that("無効な指定は黙って既定値にせずエラーにする", {
  df <- sai_factor_data()
  expect_error(run_factor_quietly(df, modifyList(base_options, list(na = "all.obs"))), "未対応")
  expect_error(run_factor_quietly(df, modifyList(base_options, list(rotation = "oblimin"))), "未対応")
  expect_error(run_factor_quietly(df, modifyList(base_options, list(method = "MINRES"))), "未対応")
})
