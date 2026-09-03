test_that("t 検定: power.t.test と一致し、ラベル・値が日本語化される", {
  res <- RunPower(data.frame(), list(
    test_type = "t", effect_size = 0.5, power = 0.8,
    sig_level = 0.05, ttest_type = "two.sample"
  ))
  ref <- power.t.test(delta = 0.5, power = 0.8, sig.level = 0.05, type = "two.sample")

  expect_match(res$sections[[1]]$title, "t検定")
  tbl <- res$sections[[1]]$table
  labels <- sai_col1(tbl)
  expect_true("サンプルサイズ n" %in% labels)
  expect_equal(
    sai_cell_num(tbl$rows[[which(labels == "サンプルサイズ n")]][[2]]),
    ref$n,
    tolerance = 1e-2
  )
  # 注: power.t.test の戻り値に type は含まれない (method 文字列に埋め込まれる)
  expect_equal(
    tbl$rows[[which(labels == "対立仮説")]][[2]],
    "両側"
  )
  expect_equal(tbl$note, "n は各群のサンプルサイズです")
})

test_that("anova: power.anova.test と一致する", {
  res <- RunPower(data.frame(), list(
    test_type = "anova", groups = 3, n = 20,
    between_var = 1, within_var = 3, sig_level = 0.05
  ))
  ref <- power.anova.test(groups = 3, n = 20, between.var = 1, within.var = 3)
  tbl <- res$sections[[1]]$table
  labels <- sai_col1(tbl)
  expect_equal(
    sai_cell_num(tbl$rows[[which(labels == "検出力 (1−β)")]][[2]]),
    ref$power,
    tolerance = 1e-3
  )
})

test_that("prop: power.prop.test と一致する", {
  res <- RunPower(data.frame(), list(
    test_type = "prop", p1 = 0.5, p2 = 0.7, power = 0.8, sig_level = 0.05
  ))
  ref <- power.prop.test(p1 = 0.5, p2 = 0.7, power = 0.8)
  tbl <- res$sections[[1]]$table
  labels <- sai_col1(tbl)
  expect_equal(
    sai_cell_num(tbl$rows[[which(labels == "サンプルサイズ n")]][[2]]),
    ref$n,
    tolerance = 1e-2
  )
})

test_that("未対応の test_type はエラー", {
  expect_error(RunPower(data.frame(), list(test_type = "bogus")), "未対応")
})

test_that("空欄が無い場合は求める項目を促すエラーになる", {
  expect_error(
    RunPower(data.frame(), list(
      test_type = "t", n = 30, effect_size = 0.5, power = 0.8, sig_level = 0.05
    )),
    "求めたい項目を1つ空欄"
  )
})

test_that("空欄が2つ以上ある場合は該当項目を挙げてエラーになる", {
  err <- tryCatch(
    RunPower(data.frame(), list(test_type = "t", effect_size = 0.5, sig_level = 0.05)),
    error = function(e) conditionMessage(e)
  )
  expect_match(err, "空欄にできるのは1つだけ")
  expect_match(err, "サンプルサイズ n")
  expect_match(err, "検出力")
})

test_that("空欄の数は検定ごとの項目で数える", {
  # prop は p1 / p2 を持つため、t 検定なら空欄1つになる入力でも足りない
  expect_error(
    RunPower(data.frame(), list(test_type = "prop", n = 30, sig_level = 0.05)),
    "空欄にできるのは1つだけ"
  )
})

test_that("定義域を外れた値は日本語のエラーになる", {
  base <- list(test_type = "t", effect_size = 0.5, sig_level = 0.05)
  expect_error(
    RunPower(data.frame(), modifyList(base, list(power = 1.2))),
    "0より大きく1より小さい"
  )
  expect_error(
    RunPower(data.frame(), modifyList(base, list(sig_level = 5, power = 0.8))),
    "有意水準"
  )
  expect_error(
    RunPower(data.frame(), list(test_type = "prop", p1 = 0.5, p2 = 0.7, n = 1)),
    "2以上"
  )
  expect_error(
    RunPower(data.frame(), list(
      test_type = "anova", groups = 1, between_var = 1, within_var = 3, power = 0.8
    )),
    "2以上"
  )
})
