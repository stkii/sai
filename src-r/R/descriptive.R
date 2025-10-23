# Execute descriptive statistics
#
# Args:
# - x (data.frame or list): Dataset containing only numeric values
# - na.rm (logical): Whether to ignore NA values
#
# Returns:
# - stats (data.frame): A data.frame where each row corresponds to a variable (column) in x,
# and columns are the descriptive statistics:
#   - mean: mean of the variable
#   - sd: standard deviation
#   - min: minimum value
#   - max: maximum value
#
Describe <- function(x, na.rm=TRUE){
  # If x is a list, convert to data.frame
  if (base::is.list(x) && !base::is.data.frame(x)) x <- base::as.data.frame(x)

  # Calculate descriptive statistics column-wise
  stats <- base::rbind(
    mean = base::colMeans(x, na.rm=na.rm),
    sd   = base::apply(x, 2, stats::sd, na.rm=na.rm),
    min  = base::apply(x, 2, base::min, na.rm=na.rm),
    max  = base::apply(x, 2, base::max, na.rm=na.rm)
  )

  # Transpose so that rows = variables, columns = statistics
  stats <- base::t(stats)

  # Set column names
  base::colnames(stats) <- c("Mean", "SD", "Min", "Max")

  return (stats)
}

# Wrapper to return ParsedTable-compatible structure
# Returns:
# - list(headers=[..], rows=[[..], ...])
#
DescribeParsed <- function(x, na.rm=TRUE){
  stats <- Describe(x, na.rm=na.rm)

  headers <- c("Variable", "Mean", "SD", "Min", "Max")
  vars <- base::rownames(stats)
  if (base::is.null(vars)) vars <- base::paste0("V", base::seq_len(base::nrow(stats)))

  rows <- base::lapply(base::seq_len(base::nrow(stats)), function(i) {
    c(vars[[i]],
      base::unname(stats[i, "Mean"]),
      base::unname(stats[i, "SD"]),
      base::unname(stats[i, "Min"]),
      base::unname(stats[i, "Max"]))
  })

  return(base::list(headers=headers, rows=rows))
}

# High-level runner used by CLI dispatcher
#
# Arguments:
# - x (data.frame): numeric dataset
# - options (list):
#     - order (character): 'default' | 'mean' | 'mean_asc' | 'mean_desc'
#
# Returns:
# - ParsedTable-like list(headers, rows)
#
RunDescriptive <- function(x, options = NULL) {
  if (base::is.null(options)) options <- base::list()
  ord <- base::tryCatch({
    o <- options$order
    if (base::is.null(o) || !base::nzchar(o)) 'default' else base::as.character(o)
  }, error = function(e) 'default')

  parsed <- DescribeParsed(x)

  # Optional sorting using Sort() utility when available
  if (base::exists("Sort") && base::is.function(base::get("Sort"))) {
    sorter <- Sort(ord)
    parsed <- sorter(parsed)
  }
  parsed
}
