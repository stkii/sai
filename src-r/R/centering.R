# Centering utilities
#
# CenterVariables(x, columns = NULL, na_rm = TRUE)
# - x: numeric vector | data.frame | matrix
# - columns: character | integer | NULL. If data.frame/matrix, columns to center.
#            NULL centers all numeric columns.
# - na_rm: logical. If TRUE, compute means with NA removed and keep NA entries as NA in output.
#
# Returns:
# - If x is a vector: numeric vector of same length with mean-centered values.
# - If x is a data.frame/matrix: object of the same class with selected columns mean-centered.
#
# Notes:
# - Non-numeric columns are left unchanged.
# - For a column where all entries are NA (under na_rm = TRUE), the output remains all NA.
# - Mean is computed using base::mean(..., na.rm = na_rm).
CenterVariables <- function(x, columns = NULL, na_rm = TRUE) {
  # Vector case ---------------------------------------------------------------
  if (is.atomic(x) && !is.list(x) && !is.data.frame(x)) {
    v <- base::as.numeric(x)
    mu <- base::mean(v, na.rm = na_rm)
    if (base::is.nan(mu)) mu <- NA_real_
    # If mean is NA (e.g., all NA and na_rm = FALSE), subtraction propagates NA
    return(v - mu)
  }

  # data.frame or matrix case ------------------------------------------------
  if (is.list(x) && !is.data.frame(x)) x <- base::as.data.frame(x, check.names = FALSE, stringsAsFactors = FALSE)

  if (!is.data.frame(x) && !is.matrix(x)) {
    stop("CenterVariables: 'x' must be a vector, data.frame, or matrix")
  }

  is_mat <- base::is.matrix(x)
  original_class <- base::class(x)

  df <- if (is_mat) base::as.data.frame(x, check.names = FALSE, stringsAsFactors = FALSE) else x

  # Determine target columns
  cols_all <- base::seq_len(base::ncol(df))
  if (is.null(columns)) {
    is_num <- base::vapply(df, is.numeric, base::logical(1))
    tgt_idx <- cols_all[is_num]
  } else if (is.character(columns)) {
    nm <- base::colnames(df)
    if (is.null(nm)) stop("CenterVariables: column names not found for character 'columns'")
    idx_all <- base::match(columns, nm, nomatch = 0L)
    if (base::any(idx_all == 0L)) base::warning("Some specified columns not found")
    tgt_idx <- idx_all[idx_all > 0L]
  } else if (is.numeric(columns)) {
    tgt_idx <- base::as.integer(columns)
    tgt_idx <- tgt_idx[tgt_idx %in% cols_all]
  } else {
    stop("CenterVariables: 'columns' must be NULL, character, or integer")
  }

  if (base::length(tgt_idx) == 0L) {
    # Nothing to center; return as-is, preserving original class
    return(x)
  }

  # Center each selected numeric column
  for (j in tgt_idx) {
    col <- df[[j]]
    if (!base::is.numeric(col)) next
    mu <- base::mean(col, na.rm = na_rm)
    if (base::is.nan(mu)) mu <- NA_real_
    df[[j]] <- col - mu
  }

  # Restore original type for matrix input
  if (is_mat) {
    m <- base::as.matrix(df)
    base::storage.mode(m) <- base::storage.mode(x)
    base::dimnames(m) <- base::dimnames(x)
    return(m)
  }
  df
}
