# Helper for checking cor.test behavior
.CheckCorrTest <- function(work_mat, corr_mtx, method="pearson", use="all.obs", alternative="two.sided") {
  n_col <- base::ncol(work_mat)
  col_names <- base::colnames(work_mat)
  if (is.null(col_names)) col_names <- base::paste0("V", base::seq_len(n_col))

  p_mtx <- matrix(NA_real_, n_col, n_col, dimnames=list(col_names, col_names))
  t_mtx <- matrix(NA_real_, n_col, n_col, dimnames=list(col_names, col_names))
  df_mtx <- matrix(NA_real_, n_col, n_col, dimnames=list(col_names, col_names))
  n_mtx <- matrix(NA_integer_, n_col, n_col, dimnames=list(col_names, col_names))

  if (use == "complete.obs") {
    # Listwise deletion: drop any row with missing values.
    ok_all <- stats::complete.cases(work_mat)
    work_mat <- work_mat[ok_all, , drop = FALSE]
  }

  for (i in base::seq_len(n_col)) {
    for (j in base::seq_len(n_col)) {
      if (j <= i) next

      x <- work_mat[, i]
      y <- work_mat[, j]

      if (use == "pairwise.complete.obs") {
        # Pairwise deletion: drop rows missing in this variable pair.
        ok_pair <- stats::complete.cases(x, y)
        x <- x[ok_pair]
        y <- y[ok_pair]
      }

      if (base::length(x) < 3 || base::length(y) < 3) next

      test <- stats::cor.test(
        x,
        y,
        alternative = alternative,
        method = method,
        exact = NULL,
        continuity = FALSE
      )

      corr_mtx[i, j] <- unname(test$estimate)

      p_mtx[i, j] <- test$p.value

      t_mtx[i, j] <- unname(test$statistic)

      df_mtx[i, j] <- if (method == "kendall") {
        NA_real_
      } else if (method == "spearman" && (is.null(test$parameter) || length(test$parameter) == 0)) {
        NA_real_
      } else {
        unname(test$parameter)
      }

      n_mtx[i, j] <- base::length(x)
    }
  }

  list(
    corr_mtx = corr_mtx,
    p_mtx = p_mtx,
    t_mtx = t_mtx,
    df_mtx = df_mtx,
    n_mtx = n_mtx
  )
}
