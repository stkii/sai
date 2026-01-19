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

.ScreePlot <- function(eig) {
  # eig = eigen(R)$values
  return(plot(eig, type = "b", bty = "l", tck = 0.02, las = 1, xlab = "Factor", ylab = "Eigen Values", main = "Scree Plot"))
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

.FactorAnalysisParsed <- function(res, n_factors) {
  loadings <- res$loadings
  structure <- res$structure
  Phi <- res$Phi
  rotmat <- res$rotmat

  output <- list(
    eigen = .EigenTableParsed(res$eig, res$prop, res$cum_prop),
    pattern = .MatrixToParsedTable(loadings, row_label = "変数"),
    rotmat = .MatrixToParsedTable(rotmat, row_label = "因子")
  )

  if (!is.null(structure)) {
    output$structure <- .MatrixToParsedTable(structure, row_label = "変数")
  }
  if (!is.null(Phi)) {
    output$phi <- .MatrixToParsedTable(Phi, row_label = "因子")
  }

  output
}

.FactorAnalysis <- function(df, n_factors, rotation, corr_use, power = 4) {
  eig_res <- .EigenAndProp(df, corr_use)
  R <- eig_res$R
  eig <- eig_res$eig
  prop <- eig_res$prop
  cum_prop <- eig_res$cum_prop

  # Perform varimax rotation
  vx_res <- .FactanalWithVarimax(R, n_factors)

  # ===== Extract results =====
  final_loadings <- vx_res$loadings
  final_rotmat <- vx_res$rotmat
  final_Phi <- NULL
  final_structure <- NULL

  if (rotation == "promax") {
    # Perform promax rotation
    promax_res <- .PromaxRotation(final_loadings, power)

    # ===== Extract results =====
    final_loadings <- promax_res$loadings
    final_Phi <- promax_res$Phi
    final_structure <- promax_res$structure
    final_rotmat <- promax_res$rotmat
  }

  list(
    loadings = final_loadings,
    Phi = final_Phi,
    structure = final_structure,
    rotmat = final_rotmat,
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
# - rotation (character): "varimax" | "promax"
# - corr_use (character): "all.obs" | "complete.obs" | "pairwise.complete.obs"
# - power (numeric): promax power parameter
#
# Returns:
# - list of ParsedDataTable-like objects
#
RunFactor <- function(df, n_factors = NULL, rotation = NULL, corr_use = NULL, power = NULL) {
  n_factors_norm <- base::tryCatch({
    n <- base::as.integer(n_factors)
    if (is.null(n) || is.na(n) || n < 1) NA_integer_ else n
  }, error = function(e) NA_integer_)
  if (is.na(n_factors_norm)) {
    base::stop("因子数が指定されていません")
  }

  rotation_norm <- base::tryCatch({
    r <- rotation
    if (is.null(r) || !base::nzchar(r)) "varimax" else base::tolower(base::as.character(r))
  }, error = function(e) "varimax")
  if (!rotation_norm %in% c("varimax", "promax")) rotation_norm <- "varimax"

  corr_use_norm <- base::tryCatch({
    u <- corr_use
    if (is.null(u) || !base::nzchar(u)) "all.obs" else base::tolower(base::as.character(u))
  }, error = function(e) "all.obs")
  if (!corr_use_norm %in% c("all.obs", "complete.obs", "pairwise.complete.obs")) corr_use_norm <- "all.obs"

  power_norm <- base::tryCatch({
    if (is.null(power)) 4 else base::as.numeric(power)
  }, error = function(e) 4)
  if (is.na(power_norm)) power_norm <- 4

  res <- .FactorAnalysis(
    df,
    n_factors = n_factors_norm,
    rotation = rotation_norm,
    corr_use = corr_use_norm,
    power = power_norm
  )

  .FactorAnalysisParsed(res, n_factors_norm)
}
