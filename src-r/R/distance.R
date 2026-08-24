# 距離・類似度の算出。測度と標準化の定義式は SPSS PROXIMITIES に合わせる。

.DISTANCE_MEASURES <- c(
  "euclid", "seuclid", "chebychev", "block", "minkowski", "correlation", "cosine"
)

# 値が大きいほど「似ている」測度。距離行列と同じ体裁で表示するため注記で区別する。
.SIMILARITY_MEASURES <- c("correlation", "cosine")

.STANDARDIZE_METHODS <- c("none", "z", "range", "rescale", "max", "mean", "sd")

.STANDARDIZE_UNITS <- c("variable", "case")

# 1系列 (1変数または1ケース) の標準化。
# range / sd が 0 になる系列では通常の式が定義できない。値を落とさず処理を続けるため
# 代替式へ切り替えるが、系列内の値の意味が変わるので degenerate を立てて呼び出し元へ返す。
.StandardizeSeries <- function(x, method) {
  ok <- !is.na(x)
  if (!any(ok)) {
    return(list(values = x, degenerate = FALSE))
  }
  v <- x[ok]
  degenerate <- FALSE
  values <- switch(method,
    z = {
      s <- stats::sd(v)
      if (s == 0) {
        degenerate <- TRUE
        x[ok] <- 0
        x
      } else {
        (x - mean(v)) / s
      }
    },
    range = {
      r <- max(v) - min(v)
      if (r == 0) {
        degenerate <- TRUE
        x
      } else {
        x / r
      }
    },
    rescale = {
      r <- max(v) - min(v)
      if (r == 0) {
        degenerate <- TRUE
        x[ok] <- 0.5
        x
      } else {
        (x - min(v)) / r
      }
    },
    max = {
      mx <- max(v)
      if (mx != 0) {
        x / mx
      } else if (min(v) != 0) {
        degenerate <- TRUE
        x / abs(min(v)) + 1
      } else {
        degenerate <- TRUE
        x
      }
    },
    mean = {
      mn <- mean(v)
      if (mn == 0) {
        degenerate <- TRUE
        x + 1
      } else {
        x / mn
      }
    },
    sd = {
      s <- stats::sd(v)
      if (s == 0) {
        degenerate <- TRUE
        x
      } else {
        x / s
      }
    },
    stop(sprintf("未対応の標準化: %s", method))
  )
  list(values = values, degenerate = degenerate)
}

# by = "variable" は列ごと、"case" は行ごとに標準化する。
# 標準化の適用単位は距離の計算対象 (変数間 / ケース間) とは独立に選べる。
.Standardize <- function(mat, method, by) {
  if (method == "none") {
    return(list(values = mat, degenerate = character(0)))
  }
  if (!by %in% .STANDARDIZE_UNITS) stop(sprintf("未対応の標準化の適用単位: %s", by))

  by_variable <- by == "variable"
  labels <- if (by_variable) colnames(mat) else rownames(mat)
  degenerate <- character(0)
  for (i in seq_along(labels)) {
    series <- if (by_variable) mat[, i] else mat[i, ]
    res <- .StandardizeSeries(series, method)
    if (by_variable) mat[, i] <- res$values else mat[i, ] <- res$values
    if (res$degenerate) degenerate <- c(degenerate, labels[i])
  }
  list(values = mat, degenerate = degenerate)
}

# 行を1オブジェクトとみなした対称な近接行列。
# correlation / cosine は類似度なので、値の向きが距離と逆になる点に注意。
.DistanceMatrix <- function(mat, measure, minkowski_p = 2) {
  if (measure == "euclid") {
    as.matrix(stats::dist(mat, method = "euclidean"))
  } else if (measure == "seuclid") {
    as.matrix(stats::dist(mat, method = "euclidean"))^2
  } else if (measure == "chebychev") {
    as.matrix(stats::dist(mat, method = "maximum"))
  } else if (measure == "block") {
    as.matrix(stats::dist(mat, method = "manhattan"))
  } else if (measure == "minkowski") {
    if (is.null(minkowski_p) || !is.finite(minkowski_p) || minkowski_p <= 0) {
      stop("Minkowski の次数 p は正の数で指定してください")
    }
    as.matrix(stats::dist(mat, method = "minkowski", p = minkowski_p))
  } else if (measure == "correlation") {
    # 行がオブジェクトなので、転置して列同士の相関を取る
    prox <- stats::cor(t(mat))
    if (anyNA(prox)) stop("相関を計算できない対象があります (値がすべて同一の系列)")
    prox
  } else if (measure == "cosine") {
    norms <- sqrt(rowSums(mat^2))
    if (any(norms == 0)) stop("コサインを計算できない対象があります (値がすべて0の系列)")
    (mat %*% t(mat)) / outer(norms, norms)
  } else {
    stop(sprintf("未対応の測度: %s", measure))
  }
}

# 近接行列の表示桁。セルごとに有効数字で丸めると小数点以下の桁数が揃わず、
# 値の大きさによっては指数表記も混ざるため、行列内の大小を目で比較できない。
# 最大値に有効4桁が残る小数桁を選び、全セルへ一律に適用する。
.ProxDigits <- function(prox) {
  v <- abs(prox[is.finite(prox) & prox != 0])
  if (length(v) == 0) return(3L)
  # 最大値の整数部の桁数を引く。ceiling(log10()) だと 1 や 100 ちょうどの値が
  # 境界に乗り、コサインの対角 (1 + 1e-16) のような誤差で桁数が1つずれる
  int_digits <- as.integer(floor(log10(max(v)))) + 1L
  max(0L, min(6L, 4L - int_digits))
}

.FmtProx <- function(x, digits) {
  if (is.null(x) || length(x) == 0 || is.na(x)) return("NA")
  formatC(x, digits = digits, format = "f")
}

.DistanceParsed <- function(prox, corner) {
  labels <- rownames(prox)
  digits <- .ProxDigits(prox)
  .UpperTriTable(labels, function(i, j) .FmtProx(prox[i, j], digits), corner = corner)
}

.StandardizeNote <- function(degenerate, by) {
  if (length(degenerate) == 0) return(NULL)
  unit <- if (by == "variable") "変数" else "ケース"
  sprintf(
    "分散または範囲が0のため通常の式で標準化できない%sがあり、代替式を適用しました: %s",
    unit, paste(degenerate, collapse = ", ")
  )
}

RunDistance <- function(df, options) {
  between <- if (is.null(options[["between"]])) "variables" else options[["between"]]
  measure <- if (is.null(options[["measure"]])) "euclid" else options[["measure"]]
  standardize <- if (is.null(options[["standardize"]])) "none" else options[["standardize"]]
  standardize_by <- if (is.null(options[["standardizeBy"]])) "variable" else options[["standardizeBy"]]
  minkowski_p <- if (is.null(options[["minkowskiP"]])) 2 else as.numeric(options[["minkowskiP"]])

  if (!between %in% c("variables", "cases")) stop(sprintf("未対応の計算対象: %s", between))
  if (!measure %in% .DISTANCE_MEASURES) stop(sprintf("未対応の測度: %s", measure))
  if (!standardize %in% .STANDARDIZE_METHODS) stop(sprintf("未対応の標準化: %s", standardize))
  if (!standardize_by %in% .STANDARDIZE_UNITS) {
    stop(sprintf("未対応の標準化の適用単位: %s", standardize_by))
  }
  if (ncol(df) < 2) stop("距離の算出には2つ以上の変数が必要です")

  # dist() は欠測があると利用可能な次元だけで計算し p / n_available 倍にスケールアップする。
  # 値が黙って変わるため、渡す前にリストワイズ削除して除外件数を注記する。
  keep <- complete.cases(df)
  before <- nrow(df)
  case_labels <- as.character(which(keep))
  df <- df[keep, , drop = FALSE]
  after <- nrow(df)
  if (after < 2) stop("有効な観測が不足しています (リストワイズ削除後)")

  mat <- as.matrix(df)
  rownames(mat) <- case_labels
  std <- .Standardize(mat, standardize, standardize_by)

  objects <- if (between == "variables") t(std$values) else std$values
  prox <- .DistanceMatrix(objects, measure, minkowski_p)

  is_similarity <- measure %in% .SIMILARITY_MEASURES
  title <- if (is_similarity) "類似度行列" else "距離行列"
  corner <- if (between == "variables") "変数" else "ケース"

  measure_note <- if (is_similarity) {
    "この測度は類似度です。値が大きいほど似ていることを表します"
  } else {
    NULL
  }
  # 行番号はリストワイズ削除前の並びなので、除外が起きると連番にならない
  case_note <- if (between == "cases") "ケースの番号は元データの行番号です" else NULL

  list(
    sections = list(list(title = title, table = .DistanceParsed(prox, corner))),
    n = after,
    n_note = .MergeNotes(
      measure_note,
      case_note,
      .StandardizeNote(std$degenerate, standardize_by),
      .ListwiseNote(before - after)
    )
  )
}
