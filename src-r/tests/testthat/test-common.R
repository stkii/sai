# common.R の共通ヘルパのテスト

test_that(".Stars は有意水準ごとに正しい星印を返す", {
  expect_identical(.Stars(0.0005), "***")
  expect_identical(.Stars(0.005), "**")
  expect_identical(.Stars(0.03), "*")
  expect_identical(.Stars(0.1), "")
})

test_that(".Stars は境界値で星を付けない (p < 閾値の厳密判定)", {
  expect_identical(.Stars(0.001), "**")
  expect_identical(.Stars(0.01), "*")
  expect_identical(.Stars(0.05), "")
})

test_that(".FmtP は p 値を3桁固定で整形し、p < .001 は < 0.001 を返す", {
  expect_identical(.FmtP(0.0004), "< 0.001")
  expect_identical(.FmtP(0.001), "0.001")
  expect_identical(.FmtP(0.02658), "0.027")
  expect_identical(.FmtP(0.8101), "0.810")
  expect_identical(.FmtP(NA), "NA")
  expect_identical(.FmtP(NULL), "NA")
})

test_that(".FmtP は丸めが星と矛盾して見える境界では表示桁を増やす", {
  expect_identical(.FmtP(0.0497), "0.0497") # 3桁だと "0.050" + * で矛盾
  expect_identical(.FmtP(0.0099), "0.0099") # 3桁だと "0.010" + ** で矛盾
  expect_identical(.FmtP(0.05), "0.050") # 星なしなので 3桁のまま
  expect_identical(.FmtP(0.01), "0.010") # * (p < .05) と "0.010" は矛盾しない
  expect_identical(.FmtP(0.011), "0.011")
})

test_that(".Stars は NA / NULL / 空ベクトルで空文字を返す", {
  expect_identical(.Stars(NA), "")
  expect_identical(.Stars(NULL), "")
  expect_identical(.Stars(numeric(0)), "")
})

test_that(".CoerceNumeric は変換できない値だけを失敗として数える", {
  r <- .CoerceNumeric(c("1", "2.5", "-", "", NA, "abc"))
  expect_equal(r$values, c(1, 2.5, NA, NA, NA, NA))
  # 空欄と NA は元から欠測なので失敗に数えない ("-" と "abc" の2件のみ)
  expect_identical(r$failed, 2L)
})

test_that(".CoercionNote は失敗がある変数だけを列挙する", {
  expect_null(.CoercionNote(c(x = 0L, y = 0L)))
  expect_null(.CoercionNote(NULL))
  expect_match(.CoercionNote(c(x = 2L, y = 0L)), "^数値に変換できない値は欠測として扱いました: x \\(2件\\)$")
})

test_that(".MergeNotes は NULL を捨てて句点で連結する", {
  expect_null(.MergeNotes(NULL, NULL))
  expect_identical(.MergeNotes("A", NULL, "B"), "A。B")
  expect_identical(.MergeNotes(NULL, "A"), "A")
})

test_that(".AsNumericDf は数値化しつつ失敗件数を attribute に載せる", {
  rows <- list(list("1", "a"), list("2", "3"), list("", "4"))
  df <- .AsNumericDf(rows, c("v1", "v2"))
  expect_identical(colnames(df), c("v1", "v2"))
  expect_equal(df$v1, c(1, 2, NA))
  expect_equal(df$v2, c(NA, 3, 4))
  expect_identical(attr(df, "coerced_counts"), c(v1 = 0L, v2 = 1L))
})

test_that(".AsNumericDf は空行・記号を含むヘッダでも列名を保つ", {
  df <- .AsNumericDf(list(), c("身長 (cm)", "体重"))
  expect_identical(colnames(df), c("身長 (cm)", "体重"))
  expect_identical(nrow(df), 0L)
})

test_that(".AsMixedDf は文字列列を保持し、欠けたセルを NA にする", {
  df <- .AsMixedDf(list(list("a", "1"), list("b")), c("g", "y"))
  expect_identical(df$g, c("a", "b"))
  expect_identical(df$y, c("1", NA))
})
