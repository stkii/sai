make_between_data <- function(seed = 12) {
  set.seed(seed)
  data.frame(
    g = rep(c("A", "B", "C"), each = 10),
    y = c(rnorm(10, 10), rnorm(10, 12), rnorm(10, 11))
  )
}

make_within_data <- function(seed = 13) {
  set.seed(seed)
  cond <- rep(c("pre", "post"), times = 8)
  data.frame(
    subj = rep(sprintf("s%02d", 1:8), each = 2),
    cond = cond,
    y = rnorm(16, mean = ifelse(cond == "post", 12, 10))
  )
}

test_that("被験者間: F 値と p 値が aov と一致する", {
  df <- make_between_data()
  res <- RunAnova(df, list(dependent = "y", factors = list("g"), design = "between"))
  ref <- summary(aov(y ~ g, data = transform(df, g = as.factor(g))))[[1]]

  rows <- res$sections[[1]]$table$rows
  expect_equal(sai_cell_num(rows[[1]][[5]]), ref[1, "F value"], tolerance = 1e-3)
  expect_equal(sai_cell_num(rows[[1]][[6]]), ref[1, "Pr(>F)"], tolerance = 1e-3)
  expect_equal(res$n, nrow(df))
})

test_that("被験者間: リストワイズ削除が n と注記に反映される", {
  df <- make_between_data()
  df$y[1] <- NA
  res <- RunAnova(df, list(dependent = "y", factors = list("g"), design = "between"))
  expect_equal(res$n, 29)
  expect_match(res$n_note, "1件")
})

test_that("反復測定: p 値が aov (Error 層) と一致し、注記が付く", {
  df <- make_within_data()
  res <- suppressWarnings(
    RunAnova(df, list(dependent = "y", factors = list("cond"), design = "within", subject = "subj"))
  )
  expect_equal(unlist(res$sections[[1]]$table$headers)[1], "層")
  expect_match(res$n_note, "反復測定")
  expect_false(grepl("リストワイズ", res$n_note))
  expect_equal(res$n, nrow(df))

  ref <- summary(aov(
    y ~ cond + Error(subj / cond),
    data = transform(df, subj = as.factor(subj), cond = as.factor(cond))
  ))
  ref_tbl <- ref[["Error: subj:cond"]][[1]]
  p_ref <- ref_tbl[trimws(rownames(ref_tbl)) == "cond", "Pr(>F)"]

  rows <- res$sections[[1]]$table$rows
  target <- Filter(
    function(r) r[[1]] == "Error: subj:cond" && trimws(r[[2]]) == "cond",
    rows
  )
  expect_equal(length(target), 1)
  expect_equal(sai_cell_num(target[[1]][[7]]), p_ref, tolerance = 1e-3)
})

test_that("反復測定: リストワイズ削除時は両方の注記が連結される", {
  df <- make_within_data()
  df$y[1] <- NA
  res <- suppressWarnings(
    RunAnova(df, list(dependent = "y", factors = list("cond"), design = "within", subject = "subj"))
  )
  expect_equal(res$n, 15)
  expect_match(res$n_note, "反復測定")
  expect_match(res$n_note, "リストワイズ削除により、1件")
})

test_that("入力不足はエラー", {
  df <- make_between_data()
  expect_error(RunAnova(df, list(factors = list("g"))), "従属変数")
  expect_error(RunAnova(df, list(dependent = "y")), "要因")
  expect_error(
    RunAnova(make_within_data(), list(dependent = "y", factors = list("cond"), design = "within")),
    "被験者ID"
  )
})
