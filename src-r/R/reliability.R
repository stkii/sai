.Reliability <- function(df) {
  k <- ncol(df)
  if (k < 2) stop("信頼性分析には2つ以上の項目が必要です")
  # check.keys = FALSE: 負相関の項目を psych に自動逆転させない (利用者に無断で α が変わるため)。
  # psych の message は Rust 側でエラー文面に混入するため抑止する。
  res <- suppressMessages(psych::alpha(df, check.keys = FALSE, warnings = FALSE))
  # k = 2 の削除時 α は 1 項目尺度となり定義できない (psych は無意味な値を返す)
  deleted <- if (k > 2) res$alpha.drop$raw_alpha else rep(NA_real_, k)
  list(coefficient = res$total$raw_alpha, deleted = deleted, items = colnames(df), k = k)
}

.OmegaTotal <- function(df) {
  # nfactors = 1 の単一因子 (congeneric) モデル。psych の既定 3 は項目数が少ないと
  # 破綻する (k = 2 でエラー、k = 3-4 で ω_h がほぼ 0) ため使わない。
  # flip = FALSE: 負荷が負の項目を psych に自動逆転させない (.Reliability の check.keys と対)。
  suppressWarnings(suppressMessages(
    psych::omega(df, nfactors = 1, plot = FALSE, flip = FALSE)
  ))$omega.tot
}

.ReliabilityOmega <- function(df) {
  k <- ncol(df)
  # k = 2 の単一因子モデルは識別不能 (psych は α と同値を返すだけ)
  if (k < 3) stop("ω係数の算出には3つ以上の項目が必要です")
  # psych::omega は n < k でも黙って値を返すため、因子分析と同じ基準で先に弾く
  if (nrow(df) < k + 1) stop("ω係数の算出に対して有効な観測が不足しています")
  # 分散ゼロの項目があると psych が欠測値を理由とする紛らわしい英語エラーを返す
  zero_var <- colnames(df)[vapply(df, function(x) sd(x) == 0, logical(1))]
  if (length(zero_var) > 0) {
    stop(sprintf("値が一定の項目は ω係数に使用できません: %s", paste(zero_var, collapse = ", ")))
  }
  # 削除時ω は psych が持たないため、項目を1つ除いた再推定で求める
  deleted <- if (k > 3) {
    vapply(seq_len(k), function(i) .OmegaTotal(df[, -i, drop = FALSE]), numeric(1))
  } else {
    rep(NA_real_, k)
  }
  list(coefficient = .OmegaTotal(df), deleted = deleted, items = colnames(df), k = k)
}

.ReliabilityParsed <- function(res, coef_label, deleted_label) {
  items_rows <- list()
  for (i in seq_along(res$items)) {
    items_rows[[length(items_rows) + 1]] <- list(res$items[i], .FmtNum(res$deleted[i]))
  }
  # 信頼性統計は統計量を列に取った横一行のテーブルにする
  summary_table <- list(
    headers = c("項目数", coef_label),
    rows = list(list(as.character(res$k), .FmtNum(res$coefficient)))
  )
  items_table <- list(
    headers = c("項目", deleted_label),
    rows = items_rows
  )
  list(summary = summary_table, items = items_table)
}

RunReliability <- function(df, options) {
  coefficient <- if (is.null(options$coefficient)) "alpha" else options$coefficient
  if (!coefficient %in% c("alpha", "omega")) {
    stop(sprintf("未対応の信頼性係数: %s", coefficient))
  }

  before <- nrow(df)
  df <- df[complete.cases(df), , drop = FALSE]
  after <- nrow(df)
  if (after < 2) stop("有効な観測が不足しています (リストワイズ削除後)")

  parsed <- if (coefficient == "omega") {
    .ReliabilityParsed(.ReliabilityOmega(df), "McDonaldのω", "削除時ω")
  } else {
    .ReliabilityParsed(.Reliability(df), "Cronbachのアルファ", "削除時α")
  }
  list(
    sections = list(
      list(title = "信頼性統計", table = parsed$summary),
      list(title = "項目削除時の信頼性", table = parsed$items)
    ),
    n = after,
    n_note = .ListwiseNote(before - after)
  )
}
