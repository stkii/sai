.GuttmanNfactors <- function(cor_mat) {
  eigs <- eigen(cor_mat, symmetric = TRUE, only.values = TRUE)$values
  n <- sum(eigs > 1)
  if (n < 1) n <- 1L
  p <- ncol(cor_mat)
  max_m <- floor((2 * p + 1 - sqrt(8 * p + 1)) / 2)
  if (n > max_m) n <- max_m
  as.integer(n)
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

.PhiTable <- function(phi, factor_labels) {
  rows <- list()
  for (i in seq_along(factor_labels)) {
    cells <- list(factor_labels[i])
    for (j in seq_along(factor_labels)) {
      cells[[length(cells) + 1]] <- .FmtNum(phi[i, j])
    }
    rows[[length(rows) + 1]] <- cells
  }
  list(headers = c("", factor_labels), rows = rows)
}

.VarianceTable <- function(load_matrix, factor_labels) {
  ss <- unname(colSums(load_matrix^2))
  n_vars <- nrow(load_matrix)
  prop <- ss / n_vars
  cum <- cumsum(prop)
  rows <- list()
  rows[[1]] <- c(list("固有値"), lapply(ss, .FmtNum))
  rows[[2]] <- c(list("寄与率"), lapply(prop, .FmtNum))
  rows[[3]] <- c(list("累積寄与率"), lapply(cum, .FmtNum))
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

  sections[[length(sections) + 1]] <- list(
    title = "因子寄与",
    table = .VarianceTable(loadings, factor_labels)
  )

  list(
    sections = sections,
    n = result_n,
    n_note = n_note
  )
}
