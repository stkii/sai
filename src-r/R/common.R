# ===================
# Common helpers
# ===================

# Build correlation matrix and prepared data matrix with missing-value handling.
#
# Args:
# - df (data.frame or matrix): numeric variables in columns. Non-numeric columns are not allowed.
# - method (character): "pearson" (default), "spearman", "kendall".
# - use (character): "all.obs" (default), "complete.obs", "pairwise.complete.obs".
#
# Returns:
# - list(work_mat, corr_mtx, n_col)
#
.PrepareCorrelation <- function(df, method = "pearson", use = "all.obs") {
  # Receive raw data.
  # Input dataset must be a data frame
  IsDataFrame(df)

  # Validation (if stop is called, frontend displays WarningDialog)
  # Check if all columns are numeric
  is_num <- if (is.data.frame(df)) base::vapply(df, is.numeric, base::logical(1)) else base::rep(TRUE, base::ncol(df))
  # 1. Reject non-numeric columns
  if (base::any(!is_num)) {
    StopWithErrCode("ERR-811")
  }
  # 2. Ensure at least two columns for correlation
  if (base::ncol(df) < 2) {
    StopWithErrCode("ERR-831")
  }

  # For speed, work in matrix form and preserve column names
  mat <- base::as.matrix(df)
  if (is.null(base::colnames(mat))) {
    base::colnames(mat) <- base::paste0("V", base::seq_len(base::ncol(mat)))
  }

  # Similar to `cor(..., use = "all.obs")`
  if (use == "all.obs" && base::any(is.na(mat))) {
    StopWithErrCode("ERR-832")
  }

  corr_mtx <- stats::cor(mat, method = method, use = use)

  work_mat <- mat
  if (use == "complete.obs") {
    # Listwise deletion: drop any row with missing values.
    ok_all <- stats::complete.cases(work_mat)
    work_mat <- work_mat[ok_all, , drop = FALSE]
  }

  list(
    work_mat = work_mat,
    corr_mtx = corr_mtx,
    n_col = base::ncol(work_mat)
  )
}
