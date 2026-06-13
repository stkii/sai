.Reliability <- function(df) {
  k <- ncol(df)
  if (k < 2) stop("信頼性分析には2つ以上の項目が必要です")
  cov_mat <- cov(df, use = "complete.obs")
  total_var <- sum(cov_mat)
  item_vars <- diag(cov_mat)
  alpha <- (k / (k - 1)) * (1 - sum(item_vars) / total_var)

  alpha_deleted <- numeric(k)
  for (i in seq_len(k)) {
    sub_cov <- cov_mat[-i, -i, drop = FALSE]
    sub_total <- sum(sub_cov)
    sub_item <- diag(sub_cov)
    k2 <- k - 1
    if (k2 < 2) {
      alpha_deleted[i] <- NA_real_
    } else {
      alpha_deleted[i] <- (k2 / (k2 - 1)) * (1 - sum(sub_item) / sub_total)
    }
  }
  list(alpha = alpha, alpha_deleted = alpha_deleted, items = colnames(df), k = k)
}

.ReliabilityParsed <- function(res) {
  items_rows <- list()
  for (i in seq_along(res$items)) {
    items_rows[[length(items_rows) + 1]] <- list(res$items[i], .FmtNum(res$alpha_deleted[i]))
  }
  # 信頼性統計は統計量を列に取った横一行のテーブルにする
  summary_table <- list(
    headers = c("項目数", "Cronbachのアルファ"),
    rows = list(list(as.character(res$k), .FmtNum(res$alpha)))
  )
  items_table <- list(
    headers = c("項目", "削除時α"),
    rows = items_rows
  )
  list(summary = summary_table, items = items_table)
}

RunReliability <- function(df, options) {
  coefficient <- if (is.null(options$coefficient)) "alpha" else options$coefficient
  if (!coefficient %in% c("alpha")) {
    stop(sprintf("未対応の信頼性係数: %s", coefficient))
  }

  before <- nrow(df)
  df <- df[complete.cases(df), , drop = FALSE]
  after <- nrow(df)
  if (after < 2) stop("有効な観測が不足しています (リストワイズ削除後)")

  res <- .Reliability(df)
  parsed <- .ReliabilityParsed(res)
  list(
    sections = list(
      list(title = "信頼性統計", table = parsed$summary),
      list(title = "項目削除時の信頼性", table = parsed$items)
    ),
    n = after,
    n_note = .ListwiseNote(before - after)
  )
}
