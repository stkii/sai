.ReadInputJson <- function(path) {
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

# p値の表示 (regression / anova 共用)。3桁固定で、p < .001 は "< 0.001" を返す。
# .FmtNum (format = "g") は微小な p で指数表記になりユーザー向け表示に適さないため分ける。
# 丸めた表示が .Stars の判定閾値を跨いで見える場合 (例: p=0.0497 -> "0.050*",
# p=0.0099 -> "0.010**") は、星との矛盾が消えるまで表示桁を増やす。
.FmtP <- function(p) {
  if (is.null(p) || length(p) == 0 || is.na(p)) return("NA")
  if (p < 0.001) return("< 0.001")
  digits <- 3
  s <- formatC(p, digits = digits, format = "f")
  while (digits < 6 &&
    ((p < 0.05 && as.numeric(s) >= 0.05) || (p < 0.01 && as.numeric(s) >= 0.01))) {
    digits <- digits + 1
    s <- formatC(p, digits = digits, format = "f")
  }
  s
}

# 有意水準の星印 (correlation / regression / anova 共用)。
# 数値の直後に連結し、フロントの SectionsView が右肩 (上付き) に描画する。
.Stars <- function(p) {
  if (is.null(p) || length(p) == 0 || is.na(p)) return("")
  if (p < 0.001) "***" else if (p < 0.01) "**" else if (p < 0.05) "*" else ""
}

.ListwiseNote <- function(removed) {
  if (removed > 0) sprintf("リストワイズ削除により、%d件の観測が除外されました", removed) else NULL
}

.PairwiseNote <- function() {
  "ペアワイズ削除のため、変数ペアごとにサンプルサイズが異なる場合があります"
}
