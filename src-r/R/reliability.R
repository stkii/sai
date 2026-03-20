# ======================
# Reliability analysis
# ======================

# Calculate cronbach's alpha
#
# Args:
# - x (data.frame): The Dataset where rows are subject and colmns are items.
#
# Returns:
# - alpha (numeric): The Cronbach's alpha coefficient of the input dataset.
#
.CronbachAlpha <- function(df) {
  # Receive raw data.
  # Input dataset must be a data frame
  IsDataFrame(df)

  # Get the number of items
  n_cols <- base::ncol(df)
  if (n_cols < 2) {
    StopWithErrCode("ERR-831")
  }

  # Calculate the variance of each item
  item_var <- base::apply(df, 2, stats::var)

  # Calculate the variance of the total score of all items
  total_var <- stats::var(base::rowSums(df))

  # Calculate the Cronbach's alpha coefficient
  alpha <- (n_cols / (n_cols - 1)) * (1 - (base::sum(item_var) / total_var))

  return(alpha)
}

# Wrapper: return ParsedTable-compatible structure for UI
# - model: 'alpha' | 'omega'
.ReliabilityParsed <- function(x, model='alpha') {
  # Coerce to data.frame matrix of numeric only
  if (is.list(x) && !is.data.frame(x)) x <- base::as.data.frame(x)
  IsDataFrame(x)

  n_cols <- base::ncol(x)
  is_alpha <- !base::identical(model, "omega")
  model_label <- if (is_alpha) "Cronbach の alpha" else "Omega"
  headers <- c(model_label, "項目の数")
  if (is_alpha) {
    val <- .CronbachAlpha(x)
    rows <- list(c(FormatNum(val), base::as.character(n_cols)))
  } else {
    rows <- list(c("Developing...", base::as.character(n_cols)))
  }
  return(list(headers = headers, rows = rows))
}

# High-level runner used by CLI dispatcher
#
# Arguments:
# - x (data.frame): numeric dataset
# - model (character): 'alpha' (default). Reserved for future extensions.
#
# Returns ParsedTable-like list(headers, rows)
RunReliability <- function(x, model = NULL) {
  model_norm <- .ValidateOptionInSet(model, c("alpha", "omega"))
  ValidateMinRows(x, 2L)
  parsed <- .ReliabilityParsed(x, model = model_norm)
  # Effective sample size: rows remaining after listwise NA removal.
  # Cronbach's alpha requires complete cases across all items, so
  # na.omit() drops any row with at least one missing value.
  parsed$n <- base::as.integer(base::nrow(stats::na.omit(x)))
  # Notify the user when listwise deletion removed observations.
  n_total <- base::as.integer(base::nrow(x))
  if (parsed$n < n_total) {
    parsed$n_note <- base::paste0("リストワイズ削除により、", n_total - parsed$n, "件の観測が除外されました")
  }
  parsed
}
