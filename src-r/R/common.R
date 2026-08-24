.ReadInputJson <- function(path) {
  jsonlite::fromJSON(path, simplifyVector = FALSE)
}

.WriteOutputJson <- function(payload, path) {
  json <- jsonlite::toJSON(payload, auto_unbox = TRUE, na = "null", null = "null")
  writeLines(json, path)
}

.RowsFromTable <- function(tbl) {
  if (length(tbl) == 0) return(list())
  lapply(tbl, as.list)
}

# 行リスト (JSON 由来) を行×列の文字行列へ正規化する。
# NULL・NA・欠けている列はすべて NA_character_ に揃える。
.AsCharMatrix <- function(rows, headers) {
  p <- length(headers)
  if (length(rows) == 0) {
    return(matrix(character(0), nrow = 0, ncol = p, dimnames = list(NULL, headers)))
  }
  cells <- vapply(rows, function(row) {
    vapply(seq_len(p), function(j) {
      v <- if (j > length(row)) NULL else row[[j]]
      if (is.null(v) || length(v) == 0 || is.na(v)) NA_character_ else as.character(v)
    }, character(1))
  }, character(p))
  mat <- if (p == 1) matrix(cells, ncol = 1) else t(cells)
  colnames(mat) <- headers
  mat
}

# 文字ベクトルを数値へ変換し、変換できなかった件数を併せて返す。
# 空欄・NA は元から欠測なので失敗には数えない。
.CoerceNumeric <- function(x) {
  chr <- as.character(x)
  num <- suppressWarnings(as.numeric(chr))
  blank <- is.na(chr) | !nzchar(trimws(chr))
  list(values = num, failed = sum(is.na(num) & !blank))
}

# 数値化に失敗した値をユーザーへ通知する注記 (変数ごとの失敗件数を受け取る)。
# 黙って NA にすると「欠測の多いデータ」に見え、数値でない列を選んだという
# 原因が伝わらないため、必ず結果に添える (ダークパターン禁止規約)。
.CoercionNote <- function(counts) {
  if (is.null(counts) || length(counts) == 0) return(NULL)
  hit <- counts[counts > 0]
  if (length(hit) == 0) return(NULL)
  sprintf("数値に変換できない値は欠測として扱いました: %s",
          paste(sprintf("%s (%d件)", names(hit), unname(hit)), collapse = ", "))
}

# 複数の注記を1本にまとめる。NULL・空文字は捨てる。
.MergeNotes <- function(...) {
  notes <- Filter(function(s) !is.null(s) && nzchar(s), list(...))
  if (length(notes) == 0) return(NULL)
  paste(unlist(notes), collapse = "。")
}

# 全列を数値化した data.frame。変換失敗件数は attribute "coerced_counts" に載せ、
# cli.R が n_note へ流し込む。
.AsNumericDf <- function(rows, headers) {
  chr <- .AsCharMatrix(rows, headers)
  cols <- lapply(seq_along(headers), function(j) .CoerceNumeric(chr[, j]))
  values <- lapply(cols, `[[`, "values")
  names(values) <- headers
  df <- as.data.frame(values, stringsAsFactors = FALSE, check.names = FALSE)
  attr(df, "coerced_counts") <- setNames(vapply(cols, `[[`, integer(1), "failed"), headers)
  df
}

.AsMixedDf <- function(rows, headers) {
  chr <- .AsCharMatrix(rows, headers)
  df <- as.data.frame(chr, stringsAsFactors = FALSE, check.names = FALSE)
  colnames(df) <- headers
  df
}

# 数値をデータテーブルのセル文字列へ戻す (.CoerceNumeric の逆操作)。
# 分析時に as.numeric で復元されるため、丸め (既定 7 桁) や指数表記で元の値を
# 損なわないようにする。NA は空文字にする (空文字は再読込時に NA へ戻る)。
# 表示用の .FmtNum とは目的が異なるので混同しない。
.NumToChr <- function(x) {
  out <- vapply(x, function(v) {
    if (is.na(v)) NA_character_ else format(v, digits = 15, scientific = FALSE, trim = TRUE)
  }, character(1))
  out[is.na(out)] <- ""
  unname(out)
}

# 表示用の数値整形。有効4桁を保ちつつ、指数表記へは切り替えない。
# 平方和のような大きな値が 6.153e+09 になると桁が読めず、同じ列の他の値とも比較できない。
# 逆に微小な値は固定小数点にすると 0.0000001234 となり読めないため、指数表記に残す。
.FmtNum <- function(x) {
  if (is.null(x) || length(x) == 0) return("NA")
  if (is.na(x)) return("NA")
  if (x != 0 && abs(x) < 1e-4) return(formatC(x, digits = 4, format = "g"))
  trimws(formatC(x, digits = 4, format = "fg"))
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

# 対称な相関系の行列を上三角だけで描画する共通ヘルパ (相関行列・因子間相関で共用)。
# 対角は "—"、下三角は空欄、上三角のみ cell(i, j) の戻り値を表示する。
# cell は上三角セルの整形関数 (相関は係数+星、因子間相関は係数のみ)。
.UpperTriTable <- function(labels, cell, corner = "変数") {
  rows <- list()
  for (i in seq_along(labels)) {
    cells <- list(labels[i])
    for (j in seq_along(labels)) {
      cells[[length(cells) + 1]] <- if (i == j) {
        "—"
      } else if (i > j) {
        ""
      } else {
        cell(i, j)
      }
    }
    rows[[length(rows) + 1]] <- cells
  }
  list(headers = c(corner, labels), rows = rows)
}

.ListwiseNote <- function(removed) {
  if (removed > 0) sprintf("リストワイズ削除により、%d件の観測が除外されました", removed) else NULL
}

.PairwiseNote <- function() {
  "ペアワイズ削除のため、変数ペアごとにサンプルサイズが異なる場合があります"
}
