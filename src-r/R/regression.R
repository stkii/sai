.CleanTerm <- function(s) {
  s <- gsub("`", "", s, fixed = TRUE)
  gsub(":", " × ", s, fixed = TRUE)
}

.Regression <- function(df, dependent, all_interactions, interactions) {
  predictors <- setdiff(colnames(df), dependent)
  terms <- sprintf("`%s`", predictors)
  if (isTRUE(all_interactions) && length(predictors) >= 2) {
    # (x1 + x2 + ...)^2 は全主効果 + 全2次交互作用に展開される
    rhs <- sprintf("(%s)^2", paste(terms, collapse = " + "))
  } else {
    rhs <- paste(terms, collapse = " + ")
    for (pair in interactions) {
      rhs <- paste(rhs, sprintf("`%s`:`%s`", pair[[1]], pair[[2]]), sep = " + ")
    }
  }
  formula <- as.formula(sprintf("`%s` ~ %s", dependent, rhs))
  fit <- lm(formula, data = df)
  list(fit = fit, summary = summary(fit))
}

.RegressionParsed <- function(res) {
  s <- res$summary
  coefs <- s$coefficients
  coef_headers <- c("＃", "推定値", "標準誤差", "t値", "p値")
  coef_rows <- list()
  for (i in seq_len(nrow(coefs))) {
    p <- coefs[i, 4]
    coef_rows[[length(coef_rows) + 1]] <- list(
      .CleanTerm(rownames(coefs)[i]),
      .FmtNum(coefs[i, 1]),
      .FmtNum(coefs[i, 2]),
      .FmtNum(coefs[i, 3]),
      sprintf("%s%s", .FmtP(p), .Stars(p))
    )
  }
  # モデル適合度は統計量を列に取った横一行のテーブルにする
  fstat <- s$fstatistic
  fit_headers <- c("R²", "調整済みR²", "残差標準誤差")
  fit_cells <- list(.FmtNum(s$r.squared), .FmtNum(s$adj.r.squared), .FmtNum(s$sigma))
  if (!is.null(fstat)) {
    # モデル全体の F 検定の p 値 (summary.lm は p を直接持たないため pf で計算)
    model_p <- pf(fstat[[1]], fstat[[2]], fstat[[3]], lower.tail = FALSE)
    fit_headers <- c(fit_headers, "F値", "自由度", "p値")
    fit_cells <- c(fit_cells, list(
      .FmtNum(fstat[[1]]),
      sprintf("%d, %d", as.integer(fstat[[2]]), as.integer(fstat[[3]])),
      sprintf("%s%s", .FmtP(model_p), .Stars(model_p))
    ))
  }
  list(
    coefs = list(headers = coef_headers, rows = coef_rows, note = "*** p < .001, ** p < .01, * p < .05"),
    fit_stats = list(headers = fit_headers, rows = list(fit_cells))
  )
}

RunRegression <- function(df, options) {
  dependent <- options$dependent
  if (is.null(dependent) || nchar(dependent) == 0) stop("目的変数が指定されていません")
  if (!(dependent %in% colnames(df))) stop(sprintf("目的変数 '%s' がデータにありません", dependent))
  if (ncol(df) < 2) stop("説明変数が必要です")

  all_interactions <- isTRUE(options$allInteractions)
  raw_pairs <- if (is.null(options$interactions)) list() else options$interactions
  predictors <- setdiff(colnames(df), dependent)
  interactions <- list()
  for (pair in raw_pairs) {
    pair <- as.character(unlist(pair))
    if (length(pair) != 2) stop("交互作用の指定が不正です (2変数のペアが必要です)")
    for (v in pair) {
      if (!(v %in% predictors)) {
        stop(sprintf("交互作用 '%s × %s' の変数 '%s' が独立変数に含まれていません", pair[[1]], pair[[2]], v))
      }
    }
    interactions[[length(interactions) + 1]] <- pair
  }

  before <- nrow(df)
  df <- df[complete.cases(df), , drop = FALSE]
  after <- nrow(df)
  if (after < 2) stop("有効な観測が不足しています (リストワイズ削除後)")

  res <- .Regression(df, dependent, all_interactions, interactions)
  parsed <- .RegressionParsed(res)
  list(
    sections = list(
      list(title = "係数表", table = parsed$coefs),
      list(title = "モデル適合度", table = parsed$fit_stats)
    ),
    n = after,
    n_note = .ListwiseNote(before - after)
  )
}
