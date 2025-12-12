# =================
# Utility Functions
#==================

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

# Create a sorter for ParsedTable-like objects produced by DescribeParsed().
#
# Arguments:
# - criterion (character): sort key. Supported values:
#     - 'default'        : keep the original order
#     - 'mean'           : sort by Mean (use 'desc' to control order)
#     - 'mean_asc'       : shorthand for Mean ascending
#     - 'mean_desc'      : shorthand for Mean descending
# - desc (logical): TRUE for descending order. Ignored if criterion includes
#   suffix '_asc' or '_desc'. Defaults to FALSE (ascending).
#
# Returns:
# - A function f(parsed) -> parsed, where 'parsed' is a list with fields
#   'headers' (character vector) and 'rows' (list of character/numeric vectors).
#
Sort <- function(criterion, desc = FALSE) {
  # normalize inputs
  if (is.null(criterion) || !base::nzchar(criterion)) criterion <- "default"
  criterion <- base::tolower(base::as.character(criterion))

  # unwrap shorthand codes (mean_asc / mean_desc)
  if (base::grepl("^mean_(asc|desc)$", criterion)) {
    desc <- base::endsWith(criterion, "desc")
    criterion <- "mean"
  }

  function(parsed) {
    # Validate structure
    if (is.null(parsed) || !is.list(parsed)) return(parsed)
    if (is.null(parsed$headers) || is.null(parsed$rows)) return(parsed)
    if (base::identical(criterion, "default")) return(parsed)

    # Only 'mean' is supported for now
    if (!base::identical(criterion, "mean")) return(parsed)

    headers <- parsed$headers
    rows <- parsed$rows

    # Locate the Mean column by header name; fallback to column 2
    mean_idx <- base::suppressWarnings(base::which(headers == "Mean"))
    if (base::length(mean_idx) != 1) mean_idx <- 2L

    # Compute numeric keys for ordering; treat non-numeric as NA
    key_vals <- base::vapply(rows, function(r) {
      val <- NA_real_
      if (!is.null(r) && base::length(r) >= mean_idx) {
        base::suppressWarnings({ val <- base::as.numeric(r[[mean_idx]]) })
      }
      val
    }, base::numeric(1))

    ord <- base::order(key_vals, decreasing = isTRUE(desc), na.last = TRUE)
    parsed$rows <- rows[ord]
    parsed
  }
}

# Rounding and formatting helpers

# Internal: half-up rounding to a fixed number of decimal digits.
# Args:
# - x (numeric): input value(s)
# - digits (integer): number of decimal places
# Returns numeric of the same length with half-up rounding applied.
.RoundHalfUp <- function(x, digits) {
  if (is.null(x)) return(NA_real_)
  s <- 10^base::as.integer(digits)
  base::sign(x) * base::floor(base::abs(x) * s + 0.5) / s
}

# Format a numeric to 3 decimal places (half-up), aligned to DTO rules.
# Args:
# - x (numeric): value to format
# - na (character or NA): placeholder for NA (missing) values; default NA -> JSON null
FormatNum <- function(x, na = NA_character_) {
  if (is.null(x) || base::length(x) == 0L) return(na)
  xv <- base::as.numeric(x)
  if (base::is.na(xv)) return(na)                 # 欠損は null
  if (base::is.nan(xv)) return("NaN!")           # NaN は "NaN!"
  if (!base::is.finite(xv)) {
    if (xv > 0) return("Inf!") else return("-Inf!")  # ±Inf は表記へ
  }
  v <- .RoundHalfUp(xv, digits = 3L)
  base::sprintf("%.3f", v)
}

# Format degrees of freedom or counts as integer string. Non-finite -> NA.
FormatDf <- function(x, na = NA_character_) {
  if (is.null(x) || base::length(x) == 0L) return(na)
  xv <- base::as.numeric(x)
  if (base::is.na(xv) || !base::is.finite(xv)) return(na)
  v <- .RoundHalfUp(xv, digits = 0L)
  base::as.character(base::as.integer(v))
}

# Format p-values to 3 decimals with <.001 rule. Missing->NA (null), non-finite->NA.
FormatPval <- function(p, na = NA_character_) {
  if (is.null(p) || base::length(p) == 0L) return(na)
  pv <- base::as.numeric(p)
  if (base::is.na(pv) || !base::is.finite(pv)) return(na)
  pr <- .RoundHalfUp(pv, digits = 3L)
  if (pv > 0 && pr == 0) return("<.001")
  base::sprintf("%.3f", pr)
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

# Replace ONLY special numeric values to match DTO rules, while preserving
# finite numbers as-is (to avoid changing legacy rendering behavior).
# - NA stays NA (-> JSON null)
# - NaN -> "NaN!"
# - +Inf / -Inf -> "Inf!" / "-Inf!"
ReplaceSpecialNum <- function(v) {
  xv <- base::as.numeric(v)
  if (base::is.na(xv)) return(xv)
  if (base::is.nan(xv)) return("NaN!")
  if (!base::is.finite(xv)) {
    if (xv > 0) return("Inf!") else return("-Inf!")
  }
  v
}
