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
Centralize <- function(df, columns = NULL, na_ignore = TRUE) {
  # Receive raw data.
  #Input dataset must be a data frame
  IsDataFrame(df)

  # 対象列の決定 ---------------------------------------------------------------
  # base::ncol(): データフレームの列数を取得
  # base::seq_len(): 1 から列数までの整数シーケンスを生成（全列のインデックス）
  cols_all <- base::seq_len(base::ncol(df))

  # Centering process ----------------------------------------
  for (i in target_idx) {
    col <- df[[j]]
    average <- base::mean(col, na.rm = na_ignore)
    if (base::is.nan(average)) average <- NA_real_
    # Center the column by subtracting the average
    df[[j]] <- col - average
  }
  # Return the centered data frame
  return(df)
}
