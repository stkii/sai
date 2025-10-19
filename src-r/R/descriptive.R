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
Describe <- function(x, na.rm=TRUE){
  # If x is a list, convert to data.frame
  if (is.list(x) && !is.data.frame(x)) x <- as.data.frame(x)

  # Calculate descriptive statistics column-wise
  stats <- rbind(
    mean = colMeans(x, na.rm=na.rm),
    sd   = apply(x, 2, sd, na.rm=na.rm),
    min  = apply(x, 2, min, na.rm=na.rm),
    max  = apply(x, 2, max, na.rm=na.rm)
  )

  # Transpose so that rows = variables, columns = statistics
  stats <- t(stats)

  # Set column names
  colnames(stats) <- c("Mean", "SD", "Min", "Max")

  return (stats)
}

# Wrapper to return ParsedTable-compatible structure
# Returns: list(headers=[..], rows=[[..], ...])
DescribeParsed <- function(x, na.rm=TRUE){
  stats <- Describe(x, na.rm=na.rm)

  headers <- c("Variable", "Mean", "SD", "Min", "Max")
  vars <- rownames(stats)
  if (is.null(vars)) vars <- paste0("V", seq_len(nrow(stats)))

  rows <- lapply(seq_len(nrow(stats)), function(i) {
    c(vars[[i]],
      unname(stats[i, "Mean"]),
      unname(stats[i, "SD"]),
      unname(stats[i, "Min"]),
      unname(stats[i, "Max"]))
  })

  return(list(headers=headers, rows=rows))
}
