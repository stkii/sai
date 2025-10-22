# Reliability analysis

# Calculate cronbach's alpha
#
# Args:
# - x (data.frame or matrix): The Dataset where rows are subject and colmns are items.
#
# Returns:
# - alpha (numeric): The Cronbach's alpha coefficient of the input dataset.
#
CronbachAlpha <- function(x) {
  # Get the number of items
  n_cols <- ncol(x)
  if (n_cols < 2) {
    stop("The input dataset must have at least two items.")
  }

  # Calculate the variance of each item
  item_var <- apply(x, 2, var)

  # Calculate the variance of the total score of all items
  total_var <- var(rowSums(x))

  # Calculate the Cronbach's alpha coefficient
  alpha <- (n_cols / (n_cols - 1)) * (1 - (sum(item_var) / total_var))

  return(alpha)
}

# Wrapper: return ParsedTable-compatible structure for UI
# - model: 'alpha' | 'omega'
ReliabilityParsed <- function(x, model='alpha') {
  # Coerce to data.frame matrix of numeric only
  if (is.list(x) && !is.data.frame(x)) x <- as.data.frame(x)
  if (!is.data.frame(x) && !is.matrix(x)) stop("x must be a data.frame or matrix")
  is_num <- if (is.data.frame(x)) vapply(x, is.numeric, logical(1)) else rep(TRUE, ncol(x))
  if (any(!is_num)) x <- x[, is_num, drop = FALSE]
  if (ncol(x) < 2) stop("Need at least two numeric columns for reliability analysis")

  headers <- c("Statistic", "Value")
  if (identical(model, 'alpha')) {
    val <- CronbachAlpha(as.matrix(x))
    rows <- list(c("Cronbach's alpha", sprintf("%.3f", val)))
  } else {
    rows <- list(c("Omega", "未実装"))
  }
  return(list(headers=headers, rows=rows))
}

# High-level runner used by CLI dispatcher
#
# Arguments:
# - x (data.frame): numeric dataset
# - options (list):
#     - model (character): 'alpha' (default). Reserved for future extensions.
#
# Returns ParsedTable-like list(headers, rows)
RunReliability <- function(x, options = NULL) {
  if (is.null(options)) options <- list()
  model <- tryCatch({
    m <- options$model
    if (is.null(m) || !nzchar(m)) 'alpha' else as.character(m)
  }, error = function(e) 'alpha')
  ReliabilityParsed(x, model = model)
}
