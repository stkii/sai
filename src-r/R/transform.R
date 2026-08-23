# 変数作成 (派生列) の変換ロジック。分析の Run<Method> とは契約が異なり、
# sections ではなく列の値そのものを返す。
# 数値化は分析と同じ .CoerceNumeric を通す。別の数値パーサを持つと、
# データプレビューでは値に見えるのに分析では欠測、という不一致が起きるため。

# JSON 由来の列 (list of scalars) を文字ベクトルへ正規化する。
.AsCharVector <- function(values) {
  if (length(values) == 0) return(character(0))
  vapply(values, function(v) {
    if (is.null(v) || length(v) == 0 || is.na(v)) NA_character_ else as.character(v)
  }, character(1))
}

# 1列を逆転する。範囲外の件数は呼び出し側がまとめてエラーにする。
.ReverseColumn <- function(values, scale_min, scale_max) {
  co <- .CoerceNumeric(.AsCharVector(values))
  num <- co$values
  list(
    values = .NumToChr(scale_min + scale_max - num),
    failed = co$failed,
    outside = sum(!is.na(num) & (num < scale_min | num > scale_max))
  )
}

# 逆転項目の作成。columns は名前付きリスト (元の列名 -> 値) で、
# 同じキーのまま変換後の値を返す。新しい列名の生成は Rust 側が担う。
ReverseItems <- function(columns, scale_min, scale_max) {
  if (length(columns) == 0) stop("逆転する項目が指定されていません")
  if (!is.numeric(scale_min) || !is.numeric(scale_max) ||
      length(scale_min) != 1 || length(scale_max) != 1 ||
      is.na(scale_min) || is.na(scale_max)) {
    stop("尺度の最小値と最大値を数値で指定してください")
  }
  if (scale_min >= scale_max) stop("尺度の最小値は最大値より小さい必要があります")

  results <- lapply(columns, .ReverseColumn, scale_min = scale_min, scale_max = scale_max)

  # 範囲外の値は尺度範囲の指定ミスか入力ミスであり、反転すると範囲外の値
  # (負値など) が黙って混入する。変換せず全項目分をまとめて報告する。
  outside <- vapply(results, `[[`, integer(1), "outside")
  hit <- outside[outside > 0]
  if (length(hit) > 0) {
    stop(sprintf("指定した尺度範囲 (%s〜%s) 外の値があります: %s",
                 .NumToChr(scale_min), .NumToChr(scale_max),
                 paste(sprintf("%s (%d件)", names(hit), unname(hit)), collapse = ", ")))
  }

  list(
    columns = lapply(results, `[[`, "values"),
    note = .CoercionNote(vapply(results, `[[`, integer(1), "failed"))
  )
}
