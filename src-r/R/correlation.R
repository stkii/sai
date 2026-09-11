.Correlation <- function(df, method, use) {
  cor_mat <- cor(df, method = method, use = use)
  k <- ncol(df)
  p_mat <- matrix(NA_real_, nrow = k, ncol = k)
  # p 値は対称なので上三角だけ検定し、対称に写す
  for (i in seq_len(k - 1)) {
    for (j in seq(i + 1, k)) {
      # cor.test は欠測ペアを自動除外する (= ペアワイズ)。リストワイズの場合は
      # 呼び出し前に df を complete.cases で絞っているため、r と p は同一サンプルになる。
      r <- tryCatch(
        cor.test(df[[i]], df[[j]], method = method),
        error = function(e) NULL
      )
      if (!is.null(r)) {
        p_mat[i, j] <- r$p.value
        p_mat[j, i] <- r$p.value
      }
    }
  }
  list(r = cor_mat, p = p_mat)
}

.CorrelationParsed <- function(res, vars) {
  # 上三角のみ表示 (対角 "—"、下三角は空欄)。上三角セルは相関係数 + 有意水準の星。
  tbl <- .UpperTriTable(vars, function(i, j) {
    sprintf("%s%s", .FmtNum(res$r[i, j]), .Stars(res$p[i, j]))
  })
  tbl$note <- "*** p < .001, ** p < .01, * p < .05"
  tbl
}

RunCorrelation <- function(df, options) {
  if (ncol(df) < 2) stop("相関分析には2つ以上の変数が必要です")
  method <- if (is.null(options$method)) "pearson" else options$method
  use <- if (is.null(options$na)) "complete.obs" else options$na
  if (!method %in% c("pearson", "spearman", "kendall")) {
    stop(sprintf("未対応の相関係数: %s", method))
  }
  if (!use %in% c("complete.obs", "pairwise.complete.obs")) {
    stop(sprintf("未対応の欠測値処理: %s", use))
  }

  if (use == "complete.obs") {
    before <- nrow(df)
    df <- df[complete.cases(df), , drop = FALSE]
    valid_n <- nrow(df)
    if (valid_n < 3) stop("有効な観測が不足しています (リストワイズ削除後)")
    res <- .Correlation(df, method, "complete.obs")
    parsed <- .CorrelationParsed(res, colnames(df))
    list(
      sections = list(list(title = "相関行列", table = parsed)),
      n = valid_n,
      n_note = .ListwiseNote(before - valid_n)
    )
  } else {
    res <- .Correlation(df, method, "pairwise.complete.obs")
    parsed <- .CorrelationParsed(res, colnames(df))
    list(
      sections = list(list(title = "相関行列", table = parsed)),
      n = nrow(df),
      n_note = .PairwiseNote()
    )
  }
}
