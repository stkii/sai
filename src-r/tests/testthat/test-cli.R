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

test_that("数値に変換できない値は n_note で通知される", {
  r <- sai_run_cli(input = list(
    method = "describe",
    headers = list("x"),
    rows = list(list("1"), list("abc"), list("3")),
    options = list(sort = "default")
  ))
  expect_equal(r$status, 0L)
  expect_match(r$result$n_note, "数値に変換できない値は欠測として扱いました: x \\(1件\\)")
})

test_that("数値化の失敗が原因でメソッドが落ちた場合、エラーに真因が添えられる", {
  # 文字列列を相関に投げると全行が欠測になり「有効な観測が不足」とだけ出るため、
  # 数値化に失敗した事実を添えて原因の誤診を防ぐ
  r <- sai_run_cli(input = list(
    method = "correlation",
    headers = list("x", "g"),
    rows = list(list("1", "男"), list("2", "女"), list("3", "男"), list("4", "女")),
    options = list(method = "pearson", na = "complete.obs")
  ))
  expect_false(r$status == 0L)
  expect_match(r$log, "有効な観測が不足")
  expect_match(r$log, "数値に変換できない値は欠測として扱いました: g \\(4件\\)")
})

test_that("反復測定で被験者ID列が射影されていない場合は原因の分かるエラーになる", {
  r <- sai_run_cli(input = list(
    method = "anova",
    headers = list("cond", "y"),
    rows = list(
      list("pre", "10"), list("post", "12"),
      list("pre", "11"), list("post", "13")
    ),
    options = list(
      dependent = "y", factors = list("cond"),
      design = "within", subject = "subj"
    )
  ))
  expect_false(r$status == 0L)
  expect_match(r$log, "被験者ID列 'subj' がデータにありません")
})

test_that("距離を E2E で実行できる", {
  r <- sai_run_cli(fixture = "distance_basic.json")
  expect_equal(r$status, 0L)
  expect_equal(length(r$result$sections), 1)
  expect_identical(r$result$sections[[1]]$title, "距離行列")
  expect_equal(r$result$n, 4)
})

test_that("多次元尺度構成法を E2E で実行できる (布置座標と適合度)", {
  r <- sai_run_cli(fixture = "mds_matrix.json")
  expect_equal(r$status, 0L)
  expect_equal(length(r$result$sections), 2)
  expect_identical(r$result$sections[[1]]$title, "布置座標")
  expect_identical(r$result$sections[[2]]$title, "適合度")
  expect_length(r$result$sections[[1]]$table$rows, 4)
})

test_that("未対応メソッドは非ゼロ終了し、エラーメッセージを返す", {
  r <- sai_run_cli(fixture = "unsupported_method.json")
  expect_false(r$status == 0L)
  expect_match(r$log, "未対応の分析メソッド")
})
