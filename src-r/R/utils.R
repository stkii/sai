# ===================
# Utiliry functions
# ===================

# Format a numeric to 3 decimal places (half-up), aligned to DTO rules.
# Args:
# - x (numeric): value to format
# - na (character or NA): placeholder for NA (missing) values; default NA -> JSON null
FormatNum <- function(x, na = NA_character_) {
  if (is.null(x) || base::length(x) == 0L) return(na)
  xv <- base::as.numeric(x)
  if (base::is.na(xv)) return(na)
  if (base::is.nan(xv)) return("NaN!")
  if (!base::is.finite(xv)) {
    if (xv > 0) return("Inf!") else return("-Inf!")
  }
  v <- .RoundHalfUp(xv, digits = 3L)
  base::sprintf("%.3f", v)
}

# Check if x is a data frame or matrix
#
# Args:
# - x (any): The object to check
#
# Returns:
# - TRUE if x is a data frame otherwise stop with warning
#
IsDataFrame <- function(x) {
  if (!base::is.data.frame(x)) {
    StopWithErrCode("ERR-810")
  }
  return(TRUE)
}

# Create a sorter for ParsedDataTable-like objects.
#
# Arguments:
# - criterion (character): sort key. Supported values:
#     - 'default'        : keep the original order
#     - 'mean_asc'       : sort by Mean ascending
#     - 'mean_desc'      : sort by Mean descending
#
# Returns:
# - A function f(parsed) -> parsed, where 'parsed' is a list with fields
#   'headers' (character vector) and 'rows' (list of character/numeric vectors).
#
Sort <- function(criterion) {
  if (is.null(criterion) || !nzchar(criterion)) {
    criterion <- "default"
  }

  is_mean <- grepl("^mean_(asc|desc)$", criterion)
  # endsWith() returns TRUE for "mean_desc", FALSE for "mean_asc".
  desc <- base::endsWith(criterion, "desc")

  function(parsed) {
    if (!is.list(parsed) || is.null(parsed$headers) || is.null(parsed$rows))
      return(parsed)

    if (!is_mean)
      return(parsed)

    mean_idx <- which(parsed$headers == "Mean")
    if (length(mean_idx) != 1)
      return(parsed)

    key_vals <- vapply(parsed$rows, function(r) {
      if (length(r) < mean_idx) return(NA_real_)
      suppressWarnings(as.numeric(r[[mean_idx]]))
    }, numeric(1))

    parsed$rows <- parsed$rows[
      base::order(key_vals, decreasing = desc, na.last = TRUE)
    ]
    parsed
  }
}

# Internal: half-up rounding to a fixed number of decimal digits.
# Args:
# - x (numeric): input value(s)
# - digits (integer): number of decimal places
# Returns:
# - A numeric vector of the same length as x, with half-up rounding applied.
.RoundHalfUp <- function(x, digits) {
  if (is.null(x)) return(NA_real_)
  s <- 10^base::as.integer(digits)
  base::sign(x) * base::floor(base::abs(x) * s + 0.5) / s
}
