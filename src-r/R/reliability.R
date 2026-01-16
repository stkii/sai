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
  model_label <- if (base::identical(model, "omega")) "omega" else "alpha"
  headers <- c(model_label, "項目の数")
  if (base::identical(model_label, "alpha")) {
    val <- .CronbachAlpha(x)
    rows <- list(c(FormatNum(val), base::as.character(n_cols)))
  } else {
    rows <- list(c("Planning", base::as.character(n_cols)))
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
  model <- base::tryCatch({
    m <- model
    if (is.null(m) || !base::nzchar(m)) "alpha" else base::tolower(base::as.character(m))
  }, error = function(e) "alpha")
  .ReliabilityParsed(x, model = model)
}
