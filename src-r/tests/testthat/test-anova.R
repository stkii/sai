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

# 1行 = 1被験者、1列 = 1条件 のワイド形式データ
make_wide_data <- function(seed = 21) {
  set.seed(seed)
  base <- rnorm(9, mean = 10)
  data.frame(
    T1 = base + rnorm(9, sd = 0.5),
    T2 = base + 3 + rnorm(9, sd = 0.5),
    T3 = base + 1 + rnorm(9, sd = 0.5)
  )
}

# 同じ内容をロング形式で表したもの (被験者は行番号)
wide_as_long <- function(w) {
  conds <- colnames(w)
  data.frame(
    subj = rep(seq_len(nrow(w)), times = length(conds)),
    cond = rep(conds, each = nrow(w)),
    y = unlist(w, use.names = FALSE)
  )
}

wide_options <- function(conditions = list("T1", "T2", "T3"), ...) {
  modifyList(
    list(design = "within", dataLayout = "wide", conditions = conditions, factorName = "条件"),
    list(...)
  )
}

# セル度数が不均衡な2要因デザイン。均衡していると Type I と Type III が一致するため、
# 平方和の型を検証できるのはこの形だけ
make_unbalanced_data <- function() {
  data.frame(
    A = c(rep("a1", 9), rep("a2", 6)),
    B = c(rep("b1", 5), rep("b2", 4), rep("b1", 2), rep("b2", 4)),
    y = c(5, 6, 7, 5, 6, 9, 10, 8, 9, 3, 4, 7, 8, 9, 7)
  )
}

# Type III の定義から直接求める: 効果符号化の下で当該項の列だけを計画行列から抜いた
# ときの残差平方和の増分。実装と同じ drop1 は使わず、定義式で照合する
unbalanced_type3_ss <- function(df, term) {
  fit <- lm(
    y ~ A * B,
    data = transform(df, A = as.factor(A), B = as.factor(B)),
    contrasts = list(A = "contr.sum", B = "contr.sum")
  )
  x <- model.matrix(fit)
  k <- which(attr(terms(fit), "term.labels") == term)
  reduced <- x[, attr(x, "assign") != k, drop = FALSE]
  sum(resid(lm.fit(reduced, df$y))^2) - sum(resid(fit)^2)
}

# 被験者間テーブルから指定した項の行を取り出す (列: 項/Df/平方和/平均平方/F値/p値)
between_row <- function(res, term) {
  hit <- Filter(function(r) trimws(r[[1]]) == term, res$sections[[1]]$table$rows)
  expect_equal(length(hit), 1)
  hit[[1]]
}

# 反復測定テーブルから指定した項の F 値を取り出す (列: 層/項/Df/平方和/平均平方/F値/p値)
within_f <- function(res, term) {
  hit <- Filter(function(r) trimws(r[[2]]) == term, res$sections[[1]]$table$rows)
  expect_equal(length(hit), 1)
  sai_cell_num(hit[[1]][[6]])
}

test_that("被験者間: F 値と p 値が aov と一致する", {
  df <- make_between_data()
  res <- RunAnova(df, list(dependent = "y", factors = list("g"), design = "between"))
  ref <- summary(aov(y ~ g, data = transform(df, g = as.factor(g))))[[1]]

  rows <- res$sections[[1]]$table$rows
  expect_equal(sai_cell_num(rows[[1]][[5]]), ref[1, "F value"], tolerance = 1e-3)
  # p値セルは .FmtP の整形 (+ 星印) と一致する
  expect_identical(gsub("\\*+$", "", rows[[1]][[6]]), .FmtP(ref[1, "Pr(>F)"]))
  expect_equal(res$n, nrow(df))
})

test_that("被験者間: リストワイズ削除が n と注記に反映される", {
  df <- make_between_data()
  df$y[1] <- NA
  res <- RunAnova(df, list(dependent = "y", factors = list("g"), design = "between"))
  expect_equal(res$n, 29)
  expect_match(res$n_note, "1件")
})

test_that("被験者間: 不均衡計画の平方和が Type III の定義と一致する", {
  df <- make_unbalanced_data()
  res <- RunAnova(df, list(dependent = "y", factors = list("A", "B"), design = "between"))

  for (term in c("A", "B", "A:B")) {
    expect_equal(
      sai_cell_num(between_row(res, term)[[3]]),
      unbalanced_type3_ss(df, term),
      tolerance = 1e-3
    )
  }
})

test_that("被験者間: 不均衡計画では逐次分解 (Type I) と一致しない", {
  df <- make_unbalanced_data()
  res <- RunAnova(df, list(dependent = "y", factors = list("A", "B"), design = "between"))
  type1 <- summary(aov(y ~ A * B, data = df))[[1]]
  ss_type1_a <- type1[trimws(rownames(type1)) == "A", "Sum Sq"]

  expect_false(isTRUE(all.equal(
    sai_cell_num(between_row(res, "A")[[3]]), ss_type1_a,
    tolerance = 1e-3
  )))
})

test_that("被験者間: 不均衡でも要因を選んだ順で結果が変わらない", {
  df <- make_unbalanced_data()
  ab <- RunAnova(df, list(dependent = "y", factors = list("A", "B"), design = "between"))
  ba <- RunAnova(df, list(dependent = "y", factors = list("B", "A"), design = "between"))

  for (term in c("A", "B")) {
    expect_equal(
      sai_cell_num(between_row(ab, term)[[5]]),
      sai_cell_num(between_row(ba, term)[[5]]),
      tolerance = 1e-6
    )
  }
})

test_that("被験者間: 誤差行の自由度と平方和が残差から算出される", {
  df <- make_unbalanced_data()
  res <- RunAnova(df, list(dependent = "y", factors = list("A", "B"), design = "between"))
  # 残差平方和は符号化の取り方に依存しないため、既定の対比の lm を参照にできる
  fit <- lm(y ~ A * B, data = df)
  row <- between_row(res, "誤差")

  expect_equal(sai_cell_num(row[[2]]), fit$df.residual)
  expect_equal(sai_cell_num(row[[3]]), sum(resid(fit)^2), tolerance = 1e-3)
  expect_identical(row[[5]], "—")
  expect_identical(row[[6]], "—")
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
    function(r) r[[1]] == "被験者内 (cond)" && trimws(r[[2]]) == "cond",
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

test_that("反復測定: 被験者ごとに条件が揃わない場合は注記で警告する", {
  df <- make_within_data()
  df$y[1] <- NA
  res <- suppressWarnings(
    RunAnova(df, list(dependent = "y", factors = list("cond"), design = "within", subject = "subj"))
  )
  expect_match(res$n_note, "平方和は解釈できません")
})

test_that("反復測定: 条件が揃っていれば不均衡の警告は出ない", {
  res <- suppressWarnings(RunAnova(
    make_within_data(),
    list(dependent = "y", factors = list("cond"), design = "within", subject = "subj")
  ))
  expect_false(grepl("平方和は解釈できません", res$n_note))
})

test_that("層は被験者間 / 被験者内 で表記され、Error: が残らない", {
  res <- suppressWarnings(RunAnova(
    make_within_data(),
    list(dependent = "y", factors = list("cond"), design = "within", subject = "subj")
  ))
  strata <- unique(vapply(res$sections[[1]]$table$rows, function(r) r[[1]], character(1)))
  expect_setequal(strata, c("被験者間", "被験者内 (cond)"))
  expect_false(any(grepl("Error", strata)))
})

test_that("2要因の被験者内計画では誤差項ごとに層が分かれる", {
  set.seed(3)
  d <- expand.grid(subj = sprintf("s%02d", 1:10), A = c("a1", "a2"), B = c("b1", "b2"))
  d$y <- rnorm(nrow(d)) + as.numeric(factor(d$A)) * 2
  res <- suppressWarnings(RunAnova(
    d,
    list(dependent = "y", factors = list("A", "B"), design = "within", subject = "subj")
  ))
  strata <- unique(vapply(res$sections[[1]]$table$rows, function(r) r[[1]], character(1)))
  expect_setequal(
    strata,
    c("被験者間", "被験者内 (A)", "被験者内 (B)", "被験者内 (A × B)")
  )
})

test_that("誤差項の行は「誤差」と表記され、F 値・p 値は — になる", {
  res <- suppressWarnings(RunAnova(
    make_within_data(),
    list(dependent = "y", factors = list("cond"), design = "within", subject = "subj")
  ))
  resid_rows <- Filter(function(r) r[[2]] == "誤差", res$sections[[1]]$table$rows)
  expect_equal(length(resid_rows), 2) # 被験者間と被験者内の2層ぶん
  for (r in resid_rows) {
    expect_identical(r[[6]], "—")
    expect_identical(r[[7]], "—")
  }

  # 被験者間デザインの誤差行も同じ扱いにする
  between <- RunAnova(
    make_between_data(),
    list(dependent = "y", factors = list("g"), design = "between")
  )
  tail_row <- between$sections[[1]]$table$rows[[2]]
  expect_identical(tail_row[[1]], "誤差")
  expect_identical(tail_row[[5]], "—")
  expect_identical(tail_row[[6]], "—")
})

test_that("項名は桁揃えの空白を含まない", {
  res <- suppressWarnings(RunAnova(
    make_within_data(),
    list(dependent = "y", factors = list("cond"), design = "within", subject = "subj")
  ))
  terms <- vapply(res$sections[[1]]$table$rows, function(r) r[[2]], character(1))
  expect_identical(terms, trimws(terms))
  expect_true("cond" %in% terms)
})

test_that("ワイド形式: 同じ内容のロング形式と同じ F 値になる", {
  w <- make_wide_data()
  res <- suppressWarnings(RunAnova(w, wide_options()))
  ref <- suppressWarnings(RunAnova(
    wide_as_long(w),
    list(dependent = "y", factors = list("cond"), design = "within", subject = "subj")
  ))
  expect_equal(within_f(res, "条件"), within_f(ref, "cond"), tolerance = 1e-4)
})

test_that("ワイド形式: n は総観測数で、行を被験者と見なしたことを注記する", {
  w <- make_wide_data()
  res <- suppressWarnings(RunAnova(w, wide_options()))
  expect_equal(res$n, 27) # 9人 × 3条件
  expect_match(res$n_note, "反復測定")
  expect_match(res$n_note, "各行を1人の被験者として扱いました \\(9人 × 3条件\\)")
  expect_false(grepl("リストワイズ", res$n_note))
})

test_that("ワイド形式: 1条件でも欠けた被験者は被験者ごと除外される", {
  w <- make_wide_data()
  w$T2[1] <- NA
  res <- suppressWarnings(RunAnova(w, wide_options()))
  # 1セルの欠測で被験者1の3行すべてが落ちる (行単位なら 26 になる)
  expect_equal(res$n, 24)
  expect_match(res$n_note, "8人 × 3条件")
  expect_match(res$n_note, "リストワイズ削除により、3件")
})

test_that("ワイド形式: 数値化に失敗した値は列ごとに通知される", {
  w <- make_wide_data()
  w$T3 <- as.character(w$T3)
  w$T3[c(2, 5)] <- c("欠測", "-")
  res <- suppressWarnings(RunAnova(w, wide_options()))
  expect_equal(res$n, 21) # 2人が脱落し 7人 × 3条件
  expect_match(res$n_note, "数値に変換できない値は欠測として扱いました: T3 \\(2件\\)")
})

test_that("ワイド形式: 指定の不備はエラーになる", {
  w <- make_wide_data()
  expect_error(RunAnova(w, wide_options(conditions = list("T1"))), "2つ以上")
  expect_error(RunAnova(w, wide_options(factorName = "")), "被験者内要因の名前")
  expect_error(RunAnova(w, wide_options(conditions = list("T1", "T9"))), "'T9' がデータにありません")
  expect_error(RunAnova(w, wide_options(factorName = "被験者")), "使用できません")
  expect_error(RunAnova(w, wide_options(design = "between")), "反復測定デザインでのみ")
  expect_error(RunAnova(w, wide_options(dataLayout = "matrix")), "未対応のデータ形式")
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

test_that("被験者ID列が射影されていない場合はドメインのエラーになる", {
  # Rust の project_columns が subject を射影し損ねた状態 (variables への入れ忘れ)。
  # R の生エラー ("undefined columns selected") ではなく原因の分かる文言を返す
  df <- make_within_data()[, c("cond", "y")]
  expect_error(
    RunAnova(df, list(dependent = "y", factors = list("cond"), design = "within", subject = "subj")),
    "被験者ID列 'subj' がデータにありません"
  )
})

test_that("従属変数の数値化に失敗した値は注記で通知される", {
  df <- make_between_data()
  df$y <- as.character(df$y)
  df$y[c(1, 2)] <- c("欠測", "N/A")
  res <- RunAnova(df, list(dependent = "y", factors = list("g"), design = "between"))
  expect_equal(res$n, 28)
  expect_match(res$n_note, "数値に変換できない値は欠測として扱いました: y \\(2件\\)")
})
