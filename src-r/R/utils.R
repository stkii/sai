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
