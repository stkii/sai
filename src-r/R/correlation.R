# Execute correlation analysis
#
# Args:
# - x (data.frame or matrix): numeric variables in columns. Non-numeric columns are not allowed.
# - mehod (character): "pearson" (default), "spearman", "kendall".
# - use (character): "all.obs" (default), "complete.obs", "pairwise.complete.obs".
.CorrTest <- function(df, method="pearson", use="all.obs", alternative="two.sided") {
  # Receive raw data.
  # Input dataset must be a data frame
  IsDataFrame(df)

  # Validation (if stop is called, frontend displays WarningDialog)
  # Check if all columns are numeric
  is_num <- if (is.data.frame(x)) base::vapply(x, is.numeric, base::logical(1)) else base::rep(TRUE, base::ncol(x))
  # 1. Reject non-numeric columns
  if (base::any(!is_num)) {
    StopWithErrCode("ERR-811")
  }
  # 2. Ensure at least two columns for correlation
  if (base::ncol(x) < 2) {
    StopWithErrCode("ERR-831")
  }
}
