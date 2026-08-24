# 多次元尺度構成法。SPSS PROXSCAL と同じ majorization (SMACOF) で
# 正規化された生ストレスを最小化する。

.MDS_TYPES <- c("ratio", "interval", "ordinal")

.MDS_TIES <- c("primary", "secondary", "tertiary")

# 類似度を非類似度へ直す。符号を反転し、最小の非類似度が0になるよう平行移動する。
# 対角は同一対象なので距離0とする。
.SimilarityToDissimilarity <- function(sim) {
  off <- sim[upper.tri(sim)]
  diss <- max(off) - sim
  diag(diss) <- 0
  diss
}

# 上下三角が食い違う近接行列を両三角の平均で対称化する。
# 入力値が変わるため、呼び出し元は必ず注記すること。
.Symmetrize <- function(m) (m + t(m)) / 2

# データ自体が非類似度行列の場合の検証と整形。
# 対角は損失関数に入らないため値を問わない (PROXSCAL も三角部分のみを読む)。
.MdsDeltaFromMatrix <- function(df) {
  m <- as.matrix(df)
  if (nrow(m) != ncol(m)) {
    stop(sprintf(
      "非類似度行列は行数と列数が一致している必要があります (行 %d、列 %d)",
      nrow(m), ncol(m)
    ))
  }
  if (nrow(m) < 3) stop("多次元尺度構成法には3つ以上の対象が必要です")
  off <- m[upper.tri(m)]
  if (anyNA(off) || anyNA(t(m)[upper.tri(m)])) {
    stop("非類似度行列に欠測があります")
  }
  if (any(off < 0) || any(m[lower.tri(m)] < 0)) {
    stop("非類似度に負の値が含まれています")
  }
  asymmetric <- !isTRUE(all.equal(m[upper.tri(m)], t(m)[upper.tri(m)], tolerance = 1e-8))
  if (asymmetric) m <- .Symmetrize(m)
  dimnames(m) <- list(colnames(df), colnames(df))
  list(
    delta = m,
    labels = colnames(df),
    n = nrow(m),
    note = if (asymmetric) {
      "非類似度行列が非対称だったため、上三角と下三角の平均を用いました"
    } else {
      NULL
    }
  )
}

# 生データから距離を計算して非類似度行列にする。
.MdsDeltaFromRaw <- function(df, between, measure, minkowski_p) {
  if (!between %in% c("variables", "cases")) stop(sprintf("未対応の計算対象: %s", between))
  if (!measure %in% .DISTANCE_MEASURES) stop(sprintf("未対応の測度: %s", measure))
  if (ncol(df) < 2) stop("距離の算出には2つ以上の変数が必要です")

  # dist() の欠測時の自動スケールアップを避けるため、距離の算出と同じくリストワイズで揃える
  keep <- complete.cases(df)
  before <- nrow(df)
  case_labels <- as.character(which(keep))
  df <- df[keep, , drop = FALSE]
  after <- nrow(df)
  if (after < 2) stop("有効な観測が不足しています (リストワイズ削除後)")

  mat <- as.matrix(df)
  rownames(mat) <- case_labels
  objects <- if (between == "variables") t(mat) else mat
  if (nrow(objects) < 3) stop("多次元尺度構成法には3つ以上の対象が必要です")

  prox <- .DistanceMatrix(objects, measure, minkowski_p)
  is_similarity <- measure %in% .SIMILARITY_MEASURES
  delta <- if (is_similarity) .SimilarityToDissimilarity(prox) else prox

  list(
    delta = delta,
    labels = rownames(prox),
    n = after,
    note = .MergeNotes(
      if (is_similarity) {
        "類似度を符号反転して非類似度に変換しました (最小の非類似度が0)"
      } else {
        NULL
      },
      if (between == "cases") "ケースの番号は元データの行番号です" else NULL,
      .ListwiseNote(before - after)
    )
  )
}

.MdsConfigTable <- function(conf, labels) {
  dim_labels <- sprintf("次元%d", seq_len(ncol(conf)))
  rows <- lapply(seq_along(labels), function(i) {
    c(list(labels[i]), lapply(conf[i, ], .FmtNum))
  })
  list(headers = c("対象", dim_labels), rows = rows)
}

# PROXSCAL の Stress and Fit Measures に対応する。
# smacof が返す $stress は Stress-I (正規化済み) で、正規化された生ストレスはその2乗。
# 正規化の定義 (重み付き変換済み近接度の平方和 = n(n-1)/2) が PROXSCAL と一致するため、
# 以下の指標はすべて $stress から代数的に導ける。
.MdsFitTable <- function(res) {
  stress1 <- res$stress
  raw <- stress1^2
  rows <- list(
    list("正規化された生ストレス", .FmtNum(raw)),
    list("Stress-I", .FmtNum(stress1)),
    list("分散説明率 (D.A.F.)", .FmtNum(1 - raw)),
    list("Tucker の一致係数", .FmtNum(sqrt(1 - raw))),
    list("反復回数", as.character(res$niter))
  )
  list(headers = c("指標", "値"), rows = rows)
}

RunMds <- function(df, options) {
  source_mode <- if (is.null(options[["source"]])) "raw" else options[["source"]]
  type <- if (is.null(options[["type"]])) "ratio" else options[["type"]]
  ties <- if (is.null(options[["ties"]])) "secondary" else options[["ties"]]
  ndim <- if (is.null(options[["ndim"]])) 2L else as.integer(options[["ndim"]])
  between <- if (is.null(options[["between"]])) "variables" else options[["between"]]
  measure <- if (is.null(options[["measure"]])) "euclid" else options[["measure"]]
  minkowski_p <- if (is.null(options[["minkowskiP"]])) 2 else as.numeric(options[["minkowskiP"]])

  if (!source_mode %in% c("raw", "matrix")) {
    stop(sprintf("未対応のデータ形式: %s", source_mode))
  }
  if (!type %in% .MDS_TYPES) stop(sprintf("未対応の変換: %s", type))
  if (!ties %in% .MDS_TIES) stop(sprintf("未対応の同順位の扱い: %s", ties))
  if (is.na(ndim) || ndim < 1) stop("次元数は1以上で指定してください")

  built <- if (source_mode == "matrix") {
    .MdsDeltaFromMatrix(df)
  } else {
    .MdsDeltaFromRaw(df, between, measure, minkowski_p)
  }

  n_objects <- nrow(built$delta)
  if (ndim >= n_objects) {
    stop(sprintf("次元数は対象の数 (%d) より小さくしてください", n_objects))
  }

  res <- smacof::mds(
    delta = built$delta,
    ndim = ndim,
    type = type,
    ties = ties,
    init = "torgerson",
    principal = TRUE
  )

  conf <- res$conf
  # principal = TRUE で主軸へ回転済み。行の並びは delta と同じなのでラベルをそのまま使う
  sections <- list(
    list(title = "布置座標", table = .MdsConfigTable(conf, built$labels)),
    list(title = "適合度", table = .MdsFitTable(res))
  )

  # 対象が少ないとストレスは自由度の高さだけで小さくなる。良い布置と読み違えられるため注記する
  sparse_note <- if (n_objects < 4 * ndim + 1) {
    sprintf(
      "対象が%d個に対し%d次元です。対象の数が次元数の4倍+1を下回るとストレスは小さく出ます",
      n_objects, ndim
    )
  } else {
    NULL
  }
  # 順序変換は反復解法が局所解に落ちうる。初期布置に依存する事実を伝える
  ordinal_note <- if (type == "ordinal") {
    "順序変換は初期布置により局所解へ収束する場合があります"
  } else {
    NULL
  }
  object_note <- if (source_mode == "matrix") {
    sprintf("n は対象の数です (%d個)", n_objects)
  } else {
    NULL
  }

  list(
    sections = sections,
    n = built$n,
    n_note = .MergeNotes(built$note, object_note, sparse_note, ordinal_note)
  )
}
