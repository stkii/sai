# Reliability analysis

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
  is_num <- if (is.data.frame(x)) base::vapply(x, is.numeric, base::logical(1)) else base::rep(TRUE, base::ncol(x))
  if (base::any(!is_num)) x <- x[, is_num, drop = FALSE]

  headers <- c("Statistic", "Value")
  if (base::identical(model, 'alpha')) {
    val <- .CronbachAlpha(x)
    rows <- list(c("Cronbach's alpha", FormatNum(val)))
  } else {
    rows <- list(c("Omega", "未実装"))
  }
  return(list(headers=headers, rows=rows))
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
    if (is.null(m) || !base::nzchar(m)) 'alpha' else base::as.character(m)
  }, error = function(e) 'alpha')
  .ReliabilityParsed(x, model = model)
}
