# Execute descriptive statistics
#
# Args:
# - df (data.frame): Dataset containing only numeric values
# - na_ig (logical): Whether to ignore NA values (default TRUE)
#
# Returns:
# - stats (data.frame): A data.frame where each row corresponds to a variable (column) in x,
# and columns are the descriptive statistics:
#   - mean: mean of the variable
#   - sd: standard deviation
#   - min: minimum value
#   - max: maximum value
#
.Describe <- function(df, na_ig=TRUE){
  # Receive raw data.
  # Input dataset must be a data frame
  IsDataFrame(df)

  # Calculate descriptive statistics column-wise
  stats <- base::rbind(
    mean = base::colMeans(df, na.rm=na_ig),
    sd   = base::apply(df, 2, stats::sd, na.rm=na_ig),
    min  = base::apply(df, 2, base::min, na.rm=na_ig),
    max  = base::apply(df, 2, base::max, na.rm=na_ig)
  )

  # Transpose so that rows = variables, columns = statistics
  stats <- base::t(stats)

  # Set column names
  base::colnames(stats) <- c("Mean", "SD", "Min", "Max")

  return (stats)
}

# Wrapper to return ParsedTable-compatible structure
#
# Args:
# - stats (data.frame): Calculated descriptive statistics from .Describe()
#
# Returns:
# - list(headers=[..], rows=[[..], ...])
#
.DescribeParsed <- function(stats){
  headers <- c("Variable", "Mean", "SD", "Min", "Max")
  vars <- base::rownames(stats)
  if (is.null(vars)) vars <- base::paste0("V", base::seq_len(base::nrow(stats)))

  rows <- base::lapply(base::seq_len(base::nrow(stats)), function(i) {
    c(vars[[i]],
      base::unname(stats[i, "Mean"]),
      base::unname(stats[i, "SD"]),
      base::unname(stats[i, "Min"]),
      base::unname(stats[i, "Max"]))
  })

  return(list(headers=headers, rows=rows))
}

# Runner used by CLI dispatcher
#
# Arguments:
# - df (data.frame): numeric dataset
# - order (character): 'default' | 'mean' | 'mean_asc' | 'mean_desc'
# - na_ig (logical): whether to ignore NA values (default TRUE)
#
# Returns:
# - ParsedTable-like list(headers, rows)
#
RunDescriptive <- function(df, order = 'default', na_ig = TRUE) {
  ord <- base::tryCatch({
    o <- order
    if (is.null(o) || !base::nzchar(o)) 'default' else base::as.character(o)
  }, error = function(e) 'default')

  stats <- .Describe(df, na_ig = na_ig)
  parsed <- .DescribeParsed(stats)

  # Sorting using Sort() utility
  sorter <- Sort(ord)
  parsed <- sorter(parsed)

  parsed
}
