.ReadInputJson <- function(path) {
  if (!requireNamespace("jsonlite", quietly = TRUE)) {
    stop("jsonlite パッケージが必要です")
  }
  jsonlite::fromJSON(path, simplifyVector = FALSE)
}

.WriteOutputJson <- function(payload, path) {
  json <- jsonlite::toJSON(payload, auto_unbox = TRUE, na = "null", null = "null")
  writeLines(json, path)
}

.RowsFromTable <- function(tbl) {
  tbl_rows <- list()
  if (length(tbl) == 0) return(tbl_rows)
  for (row in tbl) {
    tbl_rows[[length(tbl_rows) + 1]] <- as.list(row)
  }
  tbl_rows
}

.AsNumericDf <- function(rows, headers) {
  if (length(rows) == 0) {
    return(data.frame(matrix(numeric(0), ncol = length(headers), dimnames = list(NULL, headers))))
  }
  mat <- matrix(NA_real_, nrow = length(rows), ncol = length(headers))
  for (i in seq_along(rows)) {
    for (j in seq_along(headers)) {
      v <- rows[[i]][[j]]
      mat[i, j] <- suppressWarnings(as.numeric(v))
    }
  }
  df <- as.data.frame(mat)
  colnames(df) <- headers
  df
}

.AsMixedDf <- function(rows, headers) {
  if (length(rows) == 0) {
    cols <- replicate(length(headers), character(0), simplify = FALSE)
    df <- as.data.frame(cols, stringsAsFactors = FALSE)
    colnames(df) <- headers
    return(df)
  }
  cols <- vector("list", length(headers))
  for (j in seq_along(headers)) {
    col <- character(length(rows))
    for (i in seq_along(rows)) {
      v <- rows[[i]][[j]]
      col[i] <- if (is.null(v) || is.na(v)) NA_character_ else as.character(v)
    }
    cols[[j]] <- col
  }
  df <- as.data.frame(cols, stringsAsFactors = FALSE)
  colnames(df) <- headers
  df
}

.FmtNum <- function(x) {
  if (is.null(x) || length(x) == 0) return("NA")
  if (is.na(x)) return("NA")
  formatC(x, digits = 4, format = "g")
}

.ListwiseNote <- function(removed) {
  if (removed > 0) sprintf("リストワイズ削除により、%d件の観測が除外されました", removed) else NULL
}

.PairwiseNote <- function() {
  "ペアワイズ削除のため、変数ペアごとにサンプルサイズが異なる場合があります"
}
