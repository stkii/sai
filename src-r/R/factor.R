# =================
# Factor analysis
# =================

.EigenAndProp <- function(df, corr_use = "all.obs") {
  # Always use Pearson correlation
  corr_res <- .PrepareCorrelation(df, method = "pearson", use = corr_use)
  work_mat <- corr_res$work_mat
  corr_mtx <- corr_res$corr_mtx
  n_col <- corr_res$n_col
  col_names <- base::colnames(work_mat)

  # Calculate eigenvalues and proportions
  eig <- eigen(corr_mtx)$values
  prop <- eig / sum(eig)
  cum_prop <- cumsum(prop)

  return(list(R = corr_mtx, eig = eig, prop = prop, cum_prop = cum_prop))
}

.ScreePlotBase64 <- function(eig) {
  tmp <- base::tempfile(fileext = ".png")
  base::on.exit(base::unlink(tmp), add = TRUE)
  grDevices::png(tmp, width = 600, height = 400, res = 96)
  graphics::plot(eig, type = "b", bty = "l", tck = 0.02, las = 1,
                 xlab = "Factor", ylab = "Eigen Values", main = "Scree Plot")
  graphics::abline(h = 1, lty = 2, col = "gray50")
  grDevices::dev.off()
  raw_bytes <- base::readBin(tmp, "raw", base::file.info(tmp)$size)
  base::paste0("data:image/png;base64,", jsonlite::base64_enc(raw_bytes))
}

.MatrixToParsedTable <- function(mat, row_label = "変数") {
  row_names <- base::rownames(mat)
  if (is.null(row_names)) row_names <- base::paste0("V", base::seq_len(base::nrow(mat)))

  col_names <- base::colnames(mat)
  if (is.null(col_names)) {
    col_names <- base::paste0("因子", base::seq_len(base::ncol(mat)))
  }

  headers <- base::c(row_label, col_names)
  rows <- base::lapply(base::seq_len(base::nrow(mat)), function(i) {
    base::c(
      row_names[[i]],
      base::vapply(base::seq_len(base::ncol(mat)), function(j) {
        FormatNum(base::unname(mat[i, j]))
      }, base::character(1))
    )
  })

  list(headers = headers, rows = rows)
}

.NormalizeFactorLabels <- function(loadings, rotmat, Phi, structure) {
  if (is.null(loadings) || !base::is.matrix(loadings)) {
    return(list(loadings = loadings, rotmat = rotmat, Phi = Phi, structure = structure))
  }

  n_factors <- base::ncol(loadings)
  labels <- base::paste0("因子", base::seq_len(n_factors))

  base::colnames(loadings) <- labels
  if (!is.null(structure) && base::is.matrix(structure)) {
    base::colnames(structure) <- labels
  }
  if (!is.null(Phi) && base::is.matrix(Phi)) {
    base::colnames(Phi) <- labels
    base::rownames(Phi) <- labels
  }
  if (!is.null(rotmat) && base::is.matrix(rotmat)) {
    base::colnames(rotmat) <- labels
    base::rownames(rotmat) <- labels
  }

  list(loadings = loadings, rotmat = rotmat, Phi = Phi, structure = structure)
}

.EigenTableParsed <- function(eig, prop, cum_prop) {
  factors <- base::paste0("因子", base::seq_len(base::length(eig)))
  headers <- base::c("因子", "固有値", "寄与率", "累積寄与率")
  rows <- base::lapply(base::seq_len(base::length(eig)), function(i) {
    base::c(
      factors[[i]],
      FormatNum(eig[[i]]),
      FormatNum(prop[[i]]),
      FormatNum(cum_prop[[i]])
    )
  })

  list(headers = headers, rows = rows)
}

.FactorAnalysisParsed <- function(res, n_factors, show_scree_plot = FALSE) {
  loadings <- res$loadings
  structure <- res$structure
  Phi <- res$Phi
  rotmat <- res$rotmat
  labeled <- .NormalizeFactorLabels(loadings, rotmat, Phi, structure)
  loadings <- labeled$loadings
  rotmat <- labeled$rotmat
  Phi <- labeled$Phi
  structure <- labeled$structure

  output <- list(
    eigen = .EigenTableParsed(res$eig, res$prop, res$cum_prop),
    pattern = .MatrixToParsedTable(loadings, row_label = "変数")
  )

  # rotmat is NULL when rotation = "none" (no rotation was applied).
  if (!is.null(rotmat)) {
    output$rotmat <- .MatrixToParsedTable(rotmat, row_label = "因子")
  }
  if (!is.null(structure)) {
    output$structure <- .MatrixToParsedTable(structure, row_label = "変数")
  }
  if (!is.null(Phi)) {
    output$phi <- .MatrixToParsedTable(Phi, row_label = "因子")
  }

  if (isTRUE(show_scree_plot)) {
    output$scree_plot <- .ScreePlotBase64(res$eig)
  }

  output
}

.FactorAnalysis <- function(df, n_factors, rotation, method, corr_use, power = 4, eig_res = NULL) {
  if (is.null(eig_res)) {
    eig_res <- .EigenAndProp(df, corr_use)
  }
  R <- eig_res$R
  eig <- eig_res$eig
  prop <- eig_res$prop
  cum_prop <- eig_res$cum_prop

  rot_res <- .RotateWithEFAtools(
    df,
    n_factors = n_factors,
    rotation = rotation,
    method = method,
    corr_use = corr_use,
    power = power
  )

  list(
    loadings = rot_res$loadings,
    Phi = rot_res$Phi,
    structure = rot_res$structure,
    rotmat = rot_res$rotmat,
    eig = eig,
    prop = prop,
    cum_prop = cum_prop
  )
}

# Runner used by CLI dispatcher
#
# Arguments:
# - df (data.frame): numeric dataset
# - n_factors (integer): number of factors
# - rotation (character): "none" | "quartimax" | "equamax" | "varimax" | "oblimin" | "promax"
# - method (character): "ml"
# - corr_use (character): "all.obs" | "complete.obs" | "pairwise.complete.obs"
# - power (numeric): promax power parameter
# - n_factors_auto (logical): whether to auto-select factors (Guttman criterion)
#
# Returns:
# - list of ParsedDataTable-like objects
#
RunFactor <- function(df, n_factors = NULL, rotation = NULL, method = NULL, corr_use = NULL,
                      power = NULL, n_factors_auto = NULL, show_scree_plot = NULL) {
  auto_norm <- .NormalizeLogicalOption(n_factors_auto, default = FALSE)
  scree_norm <- .NormalizeLogicalOption(show_scree_plot, default = FALSE)
  rotation_norm <- .ValidateOptionInSet(
    rotation,
    c("none", "quartimax", "equamax", "varimax", "oblimin", "promax")
  )
  method_norm <- .ValidateOptionInSet(method, c("ml"))
  corr_use_norm <- .ValidateOptionInSet(corr_use, c("all.obs", "complete.obs", "pairwise.complete.obs"))
  power_norm <- .NormalizePositiveNumericOption(power, default = 4)

  ValidateMinRows(df, 3L)

  if (identical(corr_use_norm, "all.obs") && base::any(is.na(df))) {
    StopWithErrCode("ERR-832")
  }

  eig_res <- NULL
  if (isTRUE(auto_norm)) {
    eig_res <- .EigenAndProp(df, corr_use_norm)
    n_factors_norm <- base::sum(eig_res$eig >= 1)
  } else {
    n_factors_norm <- .RequirePositiveIntegerOption(n_factors)
  }

  n_eff <- if (base::identical(corr_use_norm, "complete.obs")) {
    base::as.integer(base::sum(stats::complete.cases(df)))
  } else {
    base::as.integer(base::nrow(df))
  }

  res <- .FactorAnalysis(
    df,
    n_factors = n_factors_norm,
    rotation = rotation_norm,
    method = method_norm,
    corr_use = corr_use_norm,
    power = power_norm,
    eig_res = eig_res
  )

  parsed <- .FactorAnalysisParsed(res, n_factors_norm, show_scree_plot = scree_norm)

  # Effective sample size depends on the correlation matrix construction:
  #   - complete.obs: listwise deletion — N = number of fully complete rows.
  #   - pairwise.complete.obs: each variable pair may use a different subset
  #     of rows. We report nrow(df) and attach n_note to alert the user.
  #   - all.obs: no NAs allowed (validated above), so N = nrow(df) is exact.
  parsed$n <- n_eff
  n_total <- base::as.integer(base::nrow(df))
  parsed$n_note <- if (base::identical(corr_use_norm, "pairwise.complete.obs")) {
    "ペアワイズ削除のため、変数ペアごとにサンプルサイズが異なる場合があります"
  } else if (base::identical(corr_use_norm, "complete.obs") && parsed$n < n_total) {
    base::paste0("リストワイズ削除により、", n_total - parsed$n, "件の観測が除外されました")
  } else {
    NULL
  }
  parsed
}
