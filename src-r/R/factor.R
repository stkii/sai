.GuttmanNfactors <- function(df) {
  cor_mat <- cor(df, use = "complete.obs")
  eigs <- eigen(cor_mat, symmetric = TRUE, only.values = TRUE)$values
  n <- sum(eigs > 1)
  if (n < 1) n <- 1L
  p <- ncol(df)
  max_m <- floor((2 * p + 1 - sqrt(8 * p + 1)) / 2)
  if (n > max_m) n <- max_m
  as.integer(n)
}

.SortByFactor <- function(load_matrix) {
  ab <- abs(load_matrix)
  primary <- max.col(ab)
  primary_load <- ab[cbind(seq_len(nrow(ab)), primary)]
  order(primary, -primary_load)
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
  if (!requireNamespace("EFAtools", quietly = TRUE)) {
    stop("EFAtools パッケージが必要です")
  }

  nfactors_mode <- if (is.null(options$nfactorsMode)) "fixed" else options$nfactorsMode
  rotation <- if (is.null(options$rotation)) "none" else options$rotation
  method <- if (is.null(options$method)) "PAF" else options$method
  sort_by_factor <- isTRUE(options$sortByFactor)

  if (!method %in% c("PAF", "ML", "ULS")) stop(sprintf("未対応の抽出法: %s", method))
  if (!rotation %in% c("none", "varimax", "promax")) stop(sprintf("未対応の回転: %s", rotation))

  before <- nrow(df)
  df <- df[complete.cases(df), , drop = FALSE]
  after <- nrow(df)
  if (after < ncol(df) + 1) stop("有効な観測が不足しています (リストワイズ削除後)")

  nfactors <- if (nfactors_mode == "guttman") {
    .GuttmanNfactors(df)
  } else {
    if (is.null(options$nfactors)) 1L else as.integer(options$nfactors)
  }
  if (nfactors < 1) stop("因子数は1以上で指定してください")

  efa <- EFAtools::EFA(
    x = df,
    n_factors = nfactors,
    N = nrow(df),
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

  method_label <- switch(method, PAF = "主因子法", ML = "最尤法", ULS = "最小二乗法")
  rot_label <- switch(rotation, none = "回転なし", varimax = "varimax 回転", promax = "promax 回転")
  factor_count_label <- if (nfactors_mode == "guttman") {
    sprintf("固有値>1により%d因子", nfactors)
  } else {
    sprintf("%d因子", nfactors)
  }
  title_suffix <- sprintf("%s, %s, %s", method_label, rot_label, factor_count_label)

  sections <- list()
  sections[[length(sections) + 1]] <- list(
    title = sprintf("%s (%s)", pattern_title, title_suffix),
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
    n = after,
    n_note = .ListwiseNote(before - after)
  )
}
