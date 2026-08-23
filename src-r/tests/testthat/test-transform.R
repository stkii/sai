# 変数作成 (逆転項目) の変換ロジックと、transform.R の受け渡し規約を検証する。

# transform.R を本物の Rscript サブプロセスで実行する (E2E)。
# 列は as.list でくるむ (auto_unbox が長さ1の列をスカラーへ潰さないように)。
sai_run_transform <- function(kind = "reverse", columns = list(), scale_min = 1, scale_max = 5) {
  in_path <- tempfile(fileext = ".json")
  jsonlite::write_json(
    list(kind = kind, columns = lapply(columns, as.list),
         scale_min = scale_min, scale_max = scale_max),
    in_path, auto_unbox = TRUE
  )
  out_path <- tempfile(fileext = ".json")
  owd <- setwd(sai_root)
  on.exit(setwd(owd), add = TRUE)
  log <- suppressWarnings(system2(
    "Rscript",
    c("--no-save", "--no-restore", "transform.R", shQuote(in_path), shQuote(out_path)),
    stdout = TRUE, stderr = TRUE
  ))
  status <- attr(log, "status")
  list(
    status = if (is.null(status)) 0L else status,
    log = paste(log, collapse = "\n"),
    result = if (file.exists(out_path)) jsonlite::fromJSON(out_path, simplifyVector = FALSE) else NULL
  )
}

test_that("scale_min + scale_max - x で反転する", {
  res <- ReverseItems(list(Q3 = c("1", "3", "5")), 1, 5)
  expect_equal(res$columns$Q3, c("5", "3", "1"))
  expect_null(res$note)
})

test_that("複数の項目を同じ尺度範囲でまとめて反転できる", {
  res <- ReverseItems(list(Q3 = c("1", "2"), Q7 = c("6", "7")), 1, 7)
  expect_equal(res$columns$Q3, c("7", "6"))
  expect_equal(res$columns$Q7, c("2", "1"))
})

test_that("空欄は反転せず空文字のまま返る", {
  res <- ReverseItems(list(Q3 = c("1", "", NA_character_)), 1, 5)
  expect_equal(res$columns$Q3, c("5", "", ""))
  # 空欄は元から欠測なので数値化の失敗には数えない
  expect_null(res$note)
})

test_that("数値化できない値は欠測にして件数を注記する", {
  res <- ReverseItems(list(Q3 = c("1", "未回答", "5")), 1, 5)
  expect_equal(res$columns$Q3, c("5", "", "1"))
  expect_match(res$note, "Q3 \\(1件\\)")
})

test_that("尺度範囲外の値はエラーになり、列名と件数を報告する", {
  expect_error(
    ReverseItems(list(Q3 = c("1", "7", "9")), 1, 5),
    "Q3 \\(2件\\)"
  )
})

test_that("範囲外の報告は全項目分をまとめて出す", {
  err <- tryCatch(
    ReverseItems(list(Q3 = c("7"), Q5 = c("3"), Q7 = c("0")), 1, 5),
    error = conditionMessage
  )
  expect_match(err, "Q3 \\(1件\\)")
  expect_match(err, "Q7 \\(1件\\)")
  # 範囲内だけの項目は報告に出さない
  expect_false(grepl("Q5", err))
})

test_that("尺度の最小値が最大値以上ならエラーになる", {
  expect_error(ReverseItems(list(Q3 = c("1")), 5, 5), "最大値より小さい")
  expect_error(ReverseItems(list(Q3 = c("1")), 5, 1), "最大値より小さい")
})

test_that("項目が空ならエラーになる", {
  expect_error(ReverseItems(list(), 1, 5), "指定されていません")
})

test_that("小数の反転が指数表記や余計な丸めなしで返る", {
  res <- ReverseItems(list(Q3 = c("1.1", "2.5")), 1, 5)
  # 6 - 1.1 は浮動小数では 4.9000000000000004 になる
  expect_equal(res$columns$Q3, c("4.9", "3.5"))
})

test_that("transform.R が変換結果を JSON で返す", {
  r <- sai_run_transform(columns = list(Q3 = c("1", "5")), scale_min = 1, scale_max = 5)
  expect_equal(r$status, 0L)
  expect_equal(unlist(r$result$columns$Q3), c("5", "1"))
  expect_null(r$result$note)
})

test_that("1行だけでも列は配列のまま返る", {
  r <- sai_run_transform(columns = list(Q3 = c("2")), scale_min = 1, scale_max = 5)
  expect_equal(r$status, 0L)
  # スカラーへ潰れると Rust の Vec<String> と互換でなくなる
  expect_type(r$result$columns$Q3, "list")
  expect_equal(unlist(r$result$columns$Q3), "4")
})

test_that("transform.R は数値化の失敗を note で返す", {
  r <- sai_run_transform(columns = list(Q3 = c("1", "abc")), scale_min = 1, scale_max = 5)
  expect_equal(r$status, 0L)
  expect_match(r$result$note, "Q3 \\(1件\\)")
})

test_that("transform.R は範囲外の値で非ゼロ終了する", {
  r <- sai_run_transform(columns = list(Q3 = c("1", "9")), scale_min = 1, scale_max = 5)
  expect_false(r$status == 0L)
  expect_match(r$log, "尺度範囲")
})

test_that("未対応の変換は非ゼロ終了する", {
  r <- sai_run_transform(kind = "unknown", columns = list(Q3 = c("1")))
  expect_false(r$status == 0L)
  expect_match(r$log, "未対応の変換")
})
