# ==================
# Rotation helpers
# ==================

.RequireEFAtools <- function() {
  if (!requireNamespace("EFAtools", quietly = TRUE)) {
    StopWithErrCode("ERR-925")
  }
}

.RotateWithEFAtools <- function(df, n_factors, rotation, method, corr_use, power = 4) {
  .RequireEFAtools()

  efa_method <- if (identical(method, "ml")) "ML" else base::toupper(method)
  efa_rotation <- base::as.character(rotation)
  k_value <- if (identical(efa_rotation, "promax")) power else NA

  res <- EFAtools::EFA(
    x = df,
    n_factors = n_factors,
    method = efa_method,
    rotation = efa_rotation,
    type = "SPSS",
    use = corr_use,
    k = k_value,
    normalize = TRUE,
    cor_method = "pearson"
  )

  list(
    loadings = res$rot_loadings,
    Phi = res$Phi,
    structure = res$Structure,
    rotmat = res$rotmat
  )
}
