# read_sav.R を Rscript サブプロセスで起動する E2E テスト。
# .sav → ParsedTable 互換 JSON (全セル文字列) への変換規約を検証する。

# read_sav.R を本物の Rscript サブプロセスで実行する
sai_run_read_sav <- function(path) {
  in_path <- tempfile(fileext = ".json")
  jsonlite::write_json(list(path = path), in_path, auto_unbox = TRUE)
  out_path <- tempfile(fileext = ".json")
  owd <- setwd(sai_root)
  on.exit(setwd(owd), add = TRUE)
  log <- suppressWarnings(system2(
    "Rscript",
    c("--no-save", "--no-restore", "read_sav.R", shQuote(in_path), shQuote(out_path)),
    stdout = TRUE, stderr = TRUE
  ))
  status <- attr(log, "status")
  list(
    status = if (is.null(status)) 0L else status,
    log = paste(log, collapse = "\n"),
    result = if (file.exists(out_path)) jsonlite::fromJSON(out_path, simplifyVector = FALSE) else NULL
  )
}

sai_write_sav <- function(df) {
  path <- tempfile(fileext = ".sav")
  haven::write_sav(df, path)
  path
}

test_that("数値・文字列・NA を文字列テーブルへ変換できる", {
  skip_if_not_installed("haven")
  path <- sai_write_sav(data.frame(
    x = c(1, 2.5, NA),
    s = c("a", "b", "c"),
    stringsAsFactors = FALSE
  ))
  r <- sai_run_read_sav(path)
  expect_equal(r$status, 0L)
  expect_equal(unlist(r$result$headers), c("x", "s"))
  # 行は名前なし配列 (Rust の Vec<Vec<String>> と互換の形)
  expect_null(names(r$result$rows[[1]]))
  expect_equal(unlist(r$result$rows[[1]]), c("1", "a"))
  expect_equal(unlist(r$result$rows[[2]]), c("2.5", "b"))
  # NA は空文字 ("" は分析側で NA に戻る)
  expect_equal(unlist(r$result$rows[[3]]), c("", "c"))
})

test_that("値ラベル付き変数はラベルではなくコード値を保持する", {
  skip_if_not_installed("haven")
  df <- data.frame(sex = haven::labelled(c(1, 2, 1), c("男" = 1, "女" = 2)))
  r <- sai_run_read_sav(sai_write_sav(df))
  expect_equal(r$status, 0L)
  vals <- vapply(r$result$rows, function(row) row[[1]], character(1))
  expect_equal(vals, c("1", "2", "1"))
})

test_that("数値は丸め・指数表記なしで文字列化される", {
  skip_if_not_installed("haven")
  df <- data.frame(v = c(3.141592653589, 1234567890))
  r <- sai_run_read_sav(sai_write_sav(df))
  expect_equal(r$status, 0L)
  expect_equal(as.numeric(r$result$rows[[1]][[1]]), 3.141592653589)
  expect_equal(r$result$rows[[2]][[1]], "1234567890")
})

test_that("存在しないファイルは非ゼロ終了し、エラーメッセージを返す", {
  skip_if_not_installed("haven")
  r <- sai_run_read_sav(file.path(tempdir(), "no-such-file.sav"))
  expect_false(r$status == 0L)
  expect_match(r$log, "読込エラー")
})
