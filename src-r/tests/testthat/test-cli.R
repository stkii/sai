# cli.R を Rscript サブプロセスで起動する E2E テスト。
# JSON 入出力・dispatch・エラー伝搬という「配管」だけを薄く検証する。
# 統計値の正しさは各 test-<method>.R が担当する。

test_that("describe を E2E で実行できる (JSON 入出力)", {
  r <- sai_run_cli(fixture = "describe_basic.json")
  expect_equal(r$status, 0L)
  expect_equal(length(r$result$sections), 1)
  expect_equal(r$result$n, 4)
})

test_that("空文字セルは NA として扱われる", {
  r <- sai_run_cli(input = list(
    method = "describe",
    headers = list("x"),
    rows = list(list("1"), list(""), list("3")),
    options = list(sort = "default")
  ))
  expect_equal(r$status, 0L)
  # x の有効 n は 2 ("" は NA になる)
  expect_equal(sai_cell_num(r$result$sections[[1]]$table$rows[[1]][[2]]), 2)
})

test_that("回帰の交互作用オプションが cli 経由でも機能する", {
  r <- sai_run_cli(fixture = "regression_interactions.json")
  expect_equal(r$status, 0L)
  terms <- vapply(
    r$result$sections[[1]]$table$rows,
    function(row) as.character(row[[1]]),
    character(1)
  )
  expect_true("x1 × x2" %in% terms)
})

test_that("未対応メソッドは非ゼロ終了し、エラーメッセージを返す", {
  r <- sai_run_cli(fixture = "unsupported_method.json")
  expect_false(r$status == 0L)
  expect_match(r$log, "未対応の分析メソッド")
})
