# Utility Functions

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
.round_half_up <- function(x, digits) {
  if (is.null(x)) return(NA_real_)
  s <- 10^base::as.integer(digits)
  base::sign(x) * base::floor(base::abs(x) * s + 0.5) / s
}

# Format a numeric to 3 decimal places (half-up), applied only after calculations.
# Args:
# - x (numeric): value to format
# - na (character): placeholder for NA or non-finite values
# Returns a character scalar.
FormatNum <- function(x, na = "") {
  if (is.null(x) || base::length(x) == 0L) return(na)
  if (base::is.na(x)) return(na)
  v <- .round_half_up(base::as.numeric(x), digits = 3L)
  base::sprintf("%.3f", v)
}

# Format degrees of freedom or counts as an integer string (0-decimal half-up).
# Args:
# - x (numeric): value to format
# - na (character): placeholder for NA or non-finite values
# Returns a character scalar.
FormatDf <- function(x, na = "") {
  if (is.null(x) || base::length(x) == 0L) return(na)
  if (base::is.na(x)) return(na)
  v <- .round_half_up(base::as.numeric(x), digits = 0L)
  base::as.character(base::as.integer(v))
}

# Format p-values to 3 decimal places (half-up) with <.001 threshold.
# Args:
# - p (numeric): p-value
# - na (character): placeholder for NA or non-finite values
# Returns a character scalar, e.g., "0.023" or "<.001".
FormatPval <- function(p, na = "") {
  if (is.null(p) || base::length(p) == 0L) return(na)
  if (base::is.na(p)) return(na)
  pv <- base::as.numeric(p)
  if (!base::is.finite(pv)) return(na)
  pr <- .round_half_up(pv, digits = 3L)
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
