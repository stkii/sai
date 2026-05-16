.Regression <- function(df, dependent) {
  predictors <- setdiff(colnames(df), dependent)
  formula <- as.formula(
    sprintf("`%s` ~ %s", dependent, paste(sprintf("`%s`", predictors), collapse = " + "))
  )
  fit <- lm(formula, data = df)
  list(fit = fit, summary = summary(fit))
}

.RegressionParsed <- function(res) {
  s <- res$summary
  coefs <- s$coefficients
  coef_headers <- c("項", "推定値", "標準誤差", "t値", "p値")
  coef_rows <- list()
  for (i in seq_len(nrow(coefs))) {
    coef_rows[[length(coef_rows) + 1]] <- list(
      rownames(coefs)[i],
      .FmtNum(coefs[i, 1]),
      .FmtNum(coefs[i, 2]),
      .FmtNum(coefs[i, 3]),
      .FmtNum(coefs[i, 4])
    )
  }
  fstat <- s$fstatistic
  fit_rows <- list(
    list("R²", .FmtNum(s$r.squared)),
    list("調整済みR²", .FmtNum(s$adj.r.squared)),
    list("残差標準誤差", .FmtNum(s$sigma))
  )
  if (!is.null(fstat)) {
    fit_rows[[length(fit_rows) + 1]] <- list("F値", .FmtNum(fstat[[1]]))
    fit_rows[[length(fit_rows) + 1]] <- list("自由度", sprintf("%d, %d", as.integer(fstat[[2]]), as.integer(fstat[[3]])))
  }
  list(
    coefs = list(headers = coef_headers, rows = coef_rows),
    fit_stats = list(headers = c("統計量", "値"), rows = fit_rows)
  )
}

RunRegression <- function(df, options) {
  dependent <- options$dependent
  if (is.null(dependent) || nchar(dependent) == 0) stop("目的変数が指定されていません")
  if (!(dependent %in% colnames(df))) stop(sprintf("目的変数 '%s' がデータにありません", dependent))
  if (ncol(df) < 2) stop("説明変数が必要です")

  before <- nrow(df)
  df <- df[complete.cases(df), , drop = FALSE]
  after <- nrow(df)
  if (after < 2) stop("有効な観測が不足しています (リストワイズ削除後)")

  res <- .Regression(df, dependent)
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
