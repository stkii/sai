# ===================
# Utiliry functions
# ===================

# Format a numeric to 3 decimal places (half-up), aligned to DTO rules.
#
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
  formatted <- base::sprintf("%.3f", v)

  if (formatted == "-0.000") {
    return("0.000")
  }

  formatted
}

# Format p-value to 3 decimal places (half-up).
# Values smaller than 0.001 are rendered as "< 0.001".
#
# Args:
# - x (numeric): p-value
# - na (character or NA): placeholder for NA (missing) values; default NA -> JSON null
FormatPval <- function(x, na = NA_character_) {
  if (is.null(x) || base::length(x) == 0L) return(na)
  xv <- base::as.numeric(x)
  if (base::is.na(xv)) return(na)
  if (base::is.nan(xv)) return("NaN!")
  if (!base::is.finite(xv)) {
    if (xv > 0) return("Inf!") else return("-Inf!")
  }
  if (xv > 0 && xv < 0.001) {
    return("< 0.001")
  }
  v <- .RoundHalfUp(xv, digits = 3L)
  formatted <- base::sprintf("%.3f", v)
  if (formatted == "-0.000") {
    return("0.000")
  }
  formatted
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

    mean_idx <- which(parsed$headers %in% c("Mean", "平均値"))
    if (length(mean_idx) < 1)
      return(parsed)
    mean_idx <- mean_idx[[1]]

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

# Map p-value to significance stars used across analyses
# - p (numeric): p-value
# - Returns: character string among "", "*", "**", "***"
StarsForPval <- function(p) {
  if (is.null(p) || base::length(p) == 0L) return("")
  if (base::is.na(p)) return("")
  pv <- base::as.numeric(p)
  if (!base::is.finite(pv)) return("")
  if (pv < 0.001) return("***")
  if (pv < 0.01)  return("**")
  if (pv < 0.05)  return("*")
  return("")
}

# Validate that an option is a non-empty string in the allowed set.
.ValidateOptionInSet <- function(value, allowed) {
  if (is.null(value)) StopWithErrCode("ERR-920")
  val <- base::as.character(value)
  if (!base::nzchar(val)) StopWithErrCode("ERR-920")
  val_norm <- base::tolower(val)
  if (!val_norm %in% allowed) StopWithErrCode("ERR-920")
  val_norm
}

# Validate that a required logical option is provided and valid.
.RequireLogicalOption <- function(value) {
  if (is.null(value)) StopWithErrCode("ERR-920")
  if (!base::is.logical(value) || base::length(value) == 0L) StopWithErrCode("ERR-920")
  val <- value[[1]]
  if (base::is.na(val)) StopWithErrCode("ERR-920")
  val
}

# Validate an optional logical option, returning a default when missing.
.NormalizeLogicalOption <- function(value, default) {
  if (is.null(value)) return(default)
  if (!base::is.logical(value) || base::length(value) == 0L) StopWithErrCode("ERR-920")
  val <- value[[1]]
  if (base::is.na(val)) StopWithErrCode("ERR-920")
  val
}

# Validate a required positive integer option.
.RequirePositiveIntegerOption <- function(value) {
  if (is.null(value)) StopWithErrCode("ERR-920")
  if (!base::is.numeric(value)) StopWithErrCode("ERR-920")
  val <- base::as.integer(value[[1]])
  if (base::is.na(val) || val < 1L) StopWithErrCode("ERR-920")
  val
}

# Validate an optional positive numeric option, returning a default when missing.
.NormalizePositiveNumericOption <- function(value, default) {
  if (is.null(value)) return(default)
  if (!base::is.numeric(value)) StopWithErrCode("ERR-920")
  val <- base::as.numeric(value[[1]])
  if (!base::is.finite(val) || val <= 0) StopWithErrCode("ERR-920")
  val
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
