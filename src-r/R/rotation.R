# ==================
# Rotation helpers
# ==================

.FactanalWithVarimax <- function(R, n_factors) {
  # Perform factor analysis using a covariance matrix
  # Extraction: maximum likelihood (factanal default)
  # Rotation: none (we apply rotations manually)
  fa <- stats::factanal(covmat = R, factors = n_factors, rotation = "none")

  # Extract unrotated loading matrix
  loadings0 <- as.matrix(fa$loadings)

  # Apply varimax rotation with Kaiser normalization
  vx <- stats::varimax(loadings0, normalize = TRUE)

  return(list(
    # Varimax-rotated loadings
    loadings = as.matrix(vx$loadings),
    # Varimax rotation matrix
    rotmat   = vx$rotmat
  ))
}

.PromaxRotation <- function(loadings, power = 4) {
  # Compute communalities from varimax-rotated loadings
  # Each row corresponds to one observed variable
  L2 <- rowSums(loadings^2)

  # Square root of communalities
  W <- sqrt(L2)

  # Apply communality-based weighting (row-wise)
  loadings_w <- loadings * W

  # Construct target matrix using power transformation
  # Sign is preserved, magnitude is raised to the given power
  T <- sign(loadings_w) * abs(loadings_w)^power

  # Estimate oblique rotation matrix via least squares
  P <- solve(t(loadings_w) %*% loadings_w, t(loadings_w) %*% T)

  # Normalize columns of the rotation matrix
  P <- P %*% diag(1 / sqrt(colSums(P^2)))

  # Compute pattern matrix (primary promax loadings)
  pattern_mtx <- loadings %*% P

  # Compute factor correlation matrix
  Phi <- solve(t(P) %*% P)

  # Compute structure matrix (correlations between variables and factors)
  structure_mtx <- pattern_mtx %*% Phi

  return(list(
    # Pattern matrix (promax loadings)
    loadings = pattern_mtx,
    # Factor correlation matrix
    Phi = Phi,
    # Structure matrix
    structure = structure_mtx,
    # Oblique rotation matrix
    rotmat = P
  ))
}
