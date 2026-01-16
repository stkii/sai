# Center a data frame by subtracting the mean of each column
#
# Args:
# - df (data.frame): The data to center
# - columns (character or integer): The columns to center (default NULL, all columns)
# - na_ignore (logical): Whether to ignore NA values (default TRUE)
#
# Returns:
# - The centered data frame or matrix
#
CenterVariables <- function(df, columns = NULL, na_ignore = TRUE) {
  IsDataFrame(df)

  idx <- if (is.null(columns)) {
    seq_along(df)
  } else if (is.numeric(columns)) {
    as.integer(columns)
  } else {
    match(as.character(columns), names(df))
  }

  idx <- idx[!is.na(idx)]
  idx <- idx[idx >= 1L & idx <= length(df)]
  if (!length(idx)) return(df)

  num_idx <- idx[vapply(df[idx], is.numeric, logical(1))]
  if (!length(num_idx)) return(df)

  for (j in num_idx) {
    m <- mean(df[[j]], na.rm = isTRUE(na_ignore))
    if (is.nan(m)) m <- NA_real_
    df[[j]] <- df[[j]] - m
  }

  df
}
