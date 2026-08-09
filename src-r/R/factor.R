.GuttmanNfactors <- function(cor_mat) {
  eigs <- eigen(cor_mat, symmetric = TRUE, only.values = TRUE)$values
  n <- sum(eigs > 1)
  if (n < 1) n <- 1L
  p <- ncol(cor_mat)
  max_m <- floor((2 * p + 1 - sqrt(8 * p + 1)) / 2)
  if (n > max_m) n <- max_m
  as.integer(n)
}

# 抽出法・回転の影響を受けない相関行列そのものの固有値で、因子数の判断根拠になる。
# 相関行列の対角は 1 なので固有値の総和は変数の数に等しく、
# 寄与率は固有値 / 変数の数で求まる。
.EigenTable <- function(cor_mat) {
  eigs <- eigen(cor_mat, symmetric = TRUE, only.values = TRUE)$values
  prop <- eigs / ncol(cor_mat)
  cum <- cumsum(prop)
  rows <- lapply(seq_along(eigs), function(i) {
    list(as.character(i), .FmtNum(eigs[i]), .FmtNum(prop[i]), .FmtNum(cum[i]))
  })
  table <- list(headers = c("成分", "固有値", "寄与率", "累積寄与率"), rows = rows)
  # 負の固有値はペアワイズ相関行列が正定値でないときに出る。丸めて隠すと
  # 累積寄与率が 1 を超える理由が伝わらないため、そのまま出して注記する。
  if (any(eigs < 0)) {
    table$note <- "相関行列が正定値ではないため、負の固有値が含まれます"
  }
  table
}

.SortByFactor <- function(load_matrix, threshold = 0.40) {
  ab <- abs(load_matrix)
  primary <- max.col(ab)
  primary_load <- ab[cbind(seq_len(nrow(ab)), primary)]
  group <- ifelse(primary_load >= threshold, primary, ncol(load_matrix) + 1L)
  order(group, -primary_load)
}

.FormatLoading <- function(x, threshold = 0.40) {
  if (is.null(x) || length(x) == 0 || is.na(x)) return("NA")
  s <- .FmtNum(x)
  if (abs(x) >= threshold) sprintf("**%s**", s) else s
}

.LoadingTable <- function(load_matrix, vars, factor_labels) {
  rows <- list()
  for (i in seq_along(vars)) {
    cells <- list(vars[i])
    for (j in seq_along(factor_labels)) {
      cells[[length(cells) + 1]] <- .FormatLoading(load_matrix[i, j])
    }
    rows[[length(rows) + 1]] <- cells
  }
  list(headers = c("変数", factor_labels), rows = rows)
}

# 因子間相関も相関行列と同じく上三角のみ表示する (対角 "—"、下三角は空欄)。
# Phi は対称で対角は常に 1 のため、係数を出すのは上三角だけで十分。
.PhiTable <- function(phi, factor_labels) {
  .UpperTriTable(factor_labels, function(i, j) .FmtNum(phi[i, j]), corner = "")
}

# vars_accounted は EFAtools::EFA の vars_accounted(_rot)。斜交回転の負荷量平方和は
# 因子間相関を織り込んだ値 (diag(t(L) %*% L %*% Phi)) であり、パターン行列の
# 単純な二乗和とは一致しない。斜交では寄与率・累積寄与率を出さない
# (因子が相関するため負荷量平方和を加算して総分散を求められない)。
.VarianceTable <- function(vars_accounted, factor_labels, oblique) {
  rows <- list()
  rows[[1]] <- c(
    list("負荷量平方和"),
    lapply(unname(vars_accounted["SS loadings", ]), .FmtNum)
  )
  if (oblique) {
    return(list(
      headers = c("指標", factor_labels),
      rows = rows,
      note = "因子が相関するため、負荷量平方和を加算して総分散を求めることはできません"
    ))
  }
  rows[[2]] <- c(
    list("寄与率"),
    lapply(unname(vars_accounted["Prop Tot Var", ]), .FmtNum)
  )
  rows[[3]] <- c(
    list("累積寄与率"),
    lapply(unname(vars_accounted["Cum Prop Tot Var", ]), .FmtNum)
  )
  list(headers = c("指標", factor_labels), rows = rows)
}

RunFactor <- function(df, options) {
  # 必須パッケージのチェックは cli.R 冒頭の REQUIRED_PACKAGES で一括実施。
  nfactors_mode <- if (is.null(options$nfactorsMode)) "fixed" else options$nfactorsMode
  rotation <- if (is.null(options$rotation)) "none" else options$rotation
  method <- if (is.null(options$method)) "PAF" else options$method
  na_mode <- if (is.null(options$na)) "complete.obs" else options$na
  sort_by_factor <- isTRUE(options$sortByFactor)

  if (!method %in% c("PAF", "ML", "ULS")) stop(sprintf("未対応の抽出法: %s", method))
  if (!rotation %in% c("none", "varimax", "promax")) stop(sprintf("未対応の回転: %s", rotation))
  if (!na_mode %in% c("complete.obs", "pairwise.complete.obs")) {
    stop(sprintf("未対応の欠測値処理: %s", na_mode))
  }

  if (na_mode == "pairwise.complete.obs") {
    # ペアワイズ: 相関行列を EFA に直接渡す。N はペアごとの共通観測数の最小値
    # (最も保守的な値) を採用する。非正定値などで EFA が失敗した場合はその
    # エラーをそのままユーザーに返す。
    pair_n <- crossprod(!is.na(as.matrix(df)))
    n_eff <- as.integer(min(pair_n))
    if (n_eff < ncol(df) + 1) stop("有効な観測が不足しています (ペアワイズの共通観測が少なすぎます)")
    cor_mat <- cor(df, use = "pairwise.complete.obs")
    if (anyNA(cor_mat)) stop("相関行列を計算できません (共通の観測を持たない変数ペアがあります)")
    efa_x <- cor_mat
    efa_n <- n_eff
    result_n <- nrow(df)
    n_note <- .PairwiseNote()
  } else {
    before <- nrow(df)
    df <- df[complete.cases(df), , drop = FALSE]
    after <- nrow(df)
    if (after < ncol(df) + 1) stop("有効な観測が不足しています (リストワイズ削除後)")
    cor_mat <- cor(df)
    efa_x <- df
    efa_n <- after
    result_n <- after
    n_note <- .ListwiseNote(before - after)
  }

  nfactors <- if (nfactors_mode == "guttman") {
    .GuttmanNfactors(cor_mat)
  } else {
    if (is.null(options$nfactors)) 1L else as.integer(options$nfactors)
  }
  if (nfactors < 1) stop("因子数は1以上で指定してください")

  efa <- EFAtools::EFA(
    x = efa_x,
    n_factors = nfactors,
    N = efa_n,
    method = method,
    rotation = rotation,
    type = "SPSS"
  )

  loadings_raw <- if (!is.null(efa$rot_loadings)) efa$rot_loadings else efa$unrot_loadings
  loadings_orig <- as.matrix(unclass(loadings_raw))
  dimnames(loadings_orig) <- NULL

  vars_orig <- colnames(df)
  factor_labels <- sprintf("F%d", seq_len(nfactors))

  sort_idx <- if (sort_by_factor) {
    .SortByFactor(loadings_orig)
  } else {
    seq_len(nrow(loadings_orig))
  }
  vars <- vars_orig[sort_idx]
  loadings <- loadings_orig[sort_idx, , drop = FALSE]

  is_oblique <- rotation == "promax"
  pattern_title <- if (is_oblique) "パターン行列" else "因子行列"

  sections <- list()
  sections[[length(sections) + 1]] <- list(
    title = "初期の固有値",
    table = .EigenTable(cor_mat)
  )
  sections[[length(sections) + 1]] <- list(
    title = pattern_title,
    table = .LoadingTable(loadings, vars, factor_labels)
  )

  if (is_oblique && !is.null(efa$Structure)) {
    structure_orig <- as.matrix(unclass(efa$Structure))
    dimnames(structure_orig) <- NULL
    structure_sorted <- structure_orig[sort_idx, , drop = FALSE]
    sections[[length(sections) + 1]] <- list(
      title = "構造行列",
      table = .LoadingTable(structure_sorted, vars, factor_labels)
    )
    if (!is.null(efa$Phi)) {
      phi <- as.matrix(unclass(efa$Phi))
      dimnames(phi) <- NULL
      sections[[length(sections) + 1]] <- list(
        title = "因子間相関",
        table = .PhiTable(phi, factor_labels)
      )
    }
  }

  has_rot_va <- !is.null(efa$vars_accounted_rot)
  va <- if (has_rot_va) efa$vars_accounted_rot else efa$vars_accounted
  sections[[length(sections) + 1]] <- list(
    title = "因子寄与",
    table = .VarianceTable(va, factor_labels, is_oblique && has_rot_va)
  )

  list(
    sections = sections,
    n = result_n,
    n_note = n_note
  )
}
