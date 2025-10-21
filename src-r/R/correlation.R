# Execute correlation analysis
#
# Args:
# - x (data.frame or matrix): numeric variables in columns. Non-numeric columns are dropped.
# - mehod (character): "pearson" (default), "spearman", "kendall".
# - use (character): "all.obs" (default), "complete.obs", "pairwise.complete.obs".
# - alternative (character): "two.sided" (default), "greater", or "less" for the correlation test.
#
# Returns:
# - res (list): list object containing the following elements:
#   - cor (matrix): correlation matrix
#   - p (matrix): p-value matrix
#   - t (matrix): t-value matrix
#   - df (matrix): degree of freedom matrix
#   - n (matrix): sample size matrix
#   - method (character): used correlation method
#   - alternative (character): alternative hypothesis
#   - use (character): missing value handling method
#
CorrTest <- function(x, method="pearson", use="all.obs", alternative="two.sided") {
  # Convert list to data.frame if necessary
  if (is.list(x) && !is.data.frame(x)) x <- as.data.frame(x)
  if (!is.data.frame(x) && !is.matrix(x)) stop("x must be a data.frame or matrix")

  # Keep only numeric columns
  is_num <- if (is.data.frame(x)) vapply(x, is.numeric, logical(1)) else rep(TRUE, ncol(x))
  if (any(!is_num)) {
    x <- x[, is_num, drop = FALSE]  # Non-numeric columns are dropped
    warning("Non-numeric columns were dropped")
  }
  if (ncol(x) < 2) stop("Need at least two numeric columns")

  # For speed, work in matrix form and preserve column names
  x_mat <- as.matrix(x)
  colnames_x <- colnames(x_mat)
  if (is.null(colnames_x)) colnames_x <- paste0("V", seq_len(ncol(x_mat)))

  x_work <- x_mat

  # Initialize matrix (all square matrix)
  n_col <- ncol(x_work)
  col_names <- colnames(x_work)

  corr_mtx <- matrix(NA_real_, n_col, n_col, dimnames=list(col_names, col_names)) # correlation matrix
  p_mtx <- matrix(NA_real_, n_col, n_col, dimnames=list(col_names, col_names))    # p-value matrix
  t_mtx <- matrix(NA_real_, n_col, n_col, dimnames=list(col_names, col_names))    # t-value matrix
  df_mtx <- matrix(NA_real_, n_col, n_col, dimnames=list(col_names, col_names))   # degree of freedom matrix
  n_mtx <- matrix(NA_integer_, n_col, n_col, dimnames=list(col_names, col_names)) # sample size matrix

  PvalueFromTValue <- function(t_val, df, alt) {
    # Return NA if t_val or df is NA
    if (is.na(t_val) || is.na(df)) return(NA_real_)

    # Special handling for infinite values (perfect correlation, etc.)
    if (!is.finite(t_val)) {
      if (alt == "two.sided") return(0)                     # Two-sided test: p = 0
      if (alt == "greater") return(ifelse(t_val > 0, 0, 1)) # Right-sided test
      if (alt == "less") return(ifelse(t_val < 0, 0, 1))    # Left-sided test
    }

    # Calculate p-value using the t-distribution
    if (alt == "two.sided") {
      # Two-sided test: P(|T| > |t|) = 2 * P(T < -|t|)
      return(2 * stats::pt(-abs(t_val), df))
    } else if (alt == "greater") {
      # Right-sided test: P(T > t)
      return(1 - stats::pt(t_val, df))
    } else { # less
      # Left-sided test: P(T < t)
      return(stats::pt(t_val, df))
    }
  }

  corr_mtx <- stats::cor(x_work, method=method, use=use)

  if (use == "all.obs") {
    # If there are missing values, cor() will error
    n_mtx[,] <- nrow(x_work)
  } else if (use == "complete.obs") {
    # With 'complete.obs', only rows with no missing values at all are used.
    # Therefore, the effective sample size (n_complete) is the same for all variable pairs.
    n_complete <- sum(stats::complete.cases(x_work))
    n_mtx[,] <- n_complete
  } else { # pairwise.complete.obs
    m <- !is.na(x_work)
    N_num <- t(m) %*% m  # Number of non-missing values for each pair
    n_mtx[,] <- N_num
    storage.mode(n_mtx) <- "integer"
  }

  if (use == "pairwise.complete.obs") {
    for (i in seq_len(n_col)) n_mtx[i, i] <- sum(!is.na(x_work[, i]))
  }

  # t-statistic, degree of freedom, and p-value calculation (derived from corr_mtx and n_mtx)
  for (i in seq_len(n_col)) {
    # Diagonal elements
    corr_mtx[i, i] <- 1
    p_mtx[i, i] <- NA_real_
    t_mtx[i, i] <- NA_real_
    df_mtx[i, i] <- NA_real_
  }

  # non-diagonal elements
  if (n_col >= 2) {
    for (i in seq_len(n_col - 1L)) {
      for (j in seq.int(i + 1L, n_col)) {
        r <- corr_mtx[i, j]
        n <- as.numeric(n_mtx[i, j])
        df <- if (!is.na(n) && n >= 3) n - 2 else NA_real_
        t_val <- NA_real_
        if (!is.na(r) && !is.na(n) && n >= 3) {
          if (is.finite(r)) {
            if (abs(r) < 1) {
              t_val <- r * sqrt((n - 2) / (1 - r^2))
            } else {
              t_val <- sign(r) * Inf
            }
          }
        }
        df_mtx[i, j] <- df_mtx[j, i] <- df
        t_mtx[i, j] <- t_mtx[j, i] <- t_val
        p_mtx[i, j] <- p_mtx[j, i] <- PvalueFromTValue(t_val, df, alternative)
      }
    }
  }

  # Combine the results into a list
  res <- list(
    corr = corr_mtx,           # correlation matrix
    p = p_mtx,                 # p-value matrix
    t = t_mtx,                 # t-value matrix
    df = df_mtx,               # degree of freedom matrix
    n = n_mtx,                 # sample size matrix
    method = method,           # used correlation method
    alternative = alternative, # alternative hypothesis
    use = use                  # missing value handling method
  )

  # Round to N decimal places
  RoundMatrix <- function(mtx, digits = 4) {
    if (is.null(mtx)) return(NULL)
    scale <- 10^digits
    return(sign(mtx) * floor(abs(mtx) * scale + 0.5) / scale)
  }

  # intermediate data is not rounded, keep the original values
  # rounding is done in CorrParsed

  return (res)
}

# Wrapper to return ParsedTable-compatible structure for UI
# - Shows an upper-triangular correlation matrix with significance stars
# - headers: c("Variable", varnames)
# - cells: diagonal = "1.000"; upper triangle = sprintf("%.3f%s", r, stars); lower triangle = ""
CorrParsed <- function(x, method="pearson", use="all.obs", alternative="two.sided") {
  res <- CorrTest(x, method=method, use=use, alternative=alternative)
  corr <- res$corr
  pval <- res$p

  vars <- colnames(corr)
  if (is.null(vars)) vars <- paste0("V", seq_len(ncol(corr)))

  # Significance stars helper
  stars_for_p <- function(p) {
    if (is.na(p)) return("")
    if (p < 0.001) return("***")
    if (p < 0.01)  return("**")
    if (p < 0.05)  return("*")
    return("")
  }

  headers <- c("Variable", vars)
  n <- length(vars)

  # Upper-triangular correlation rows (existing behavior)
  rows_corr <- lapply(seq_len(n), function(i) {
    row_vals <- character(n + 1)
    row_vals[[1]] <- vars[[i]]
    for (j in seq_len(n)) {
      if (j < i) {
        row_vals[[j + 1]] <- "" # lower triangle blank
      } else if (j == i) {
        row_vals[[j + 1]] <- sprintf("%.3f", 1.0) # diagonal
      } else {
        r <- corr[i, j]
        p <- pval[i, j]
        if (is.na(r)) {
          row_vals[[j + 1]] <- "1.000"
        } else {
          row_vals[[j + 1]] <- paste0(sprintf("%.3f", r), stars_for_p(p))
        }
      }
    }
    row_vals
  })

  # Separator row to label p-values block
  sep_row <- c("p-value", rep("", n))

  # Upper-triangular p-value rows (3 decimals, rounded; <.001 rule applied)
  rows_p <- lapply(seq_len(n), function(i) {
    row_vals <- character(n + 1)
    row_vals[[1]] <- vars[[i]]
    for (j in seq_len(n)) {
      if (j < i) {
        row_vals[[j + 1]] <- "" # lower triangle blank
      } else if (j == i) {
        # diagonal p-value undefined -> represent as "-"
        row_vals[[j + 1]] <- "-"
      } else {
        p <- pval[i, j]
        if (is.na(p)) {
          row_vals[[j + 1]] <- "NULL"
        } else {
          # half-up rounding to 3 decimal places
          p3 <- sign(p) * floor(abs(p) * 1000 + 0.5) / 1000
          if (p > 0 && p3 == 0) {
            row_vals[[j + 1]] <- "<.001"
          } else {
            row_vals[[j + 1]] <- sprintf("%.3f", p3)
          }
        }
      }
    }
    row_vals
  })

  rows <- c(rows_corr, list(sep_row), rows_p)
  return(list(headers=headers, rows=rows))
}

# High-level runner used by CLI dispatcher
#
# Arguments:
# - x (data.frame): numeric dataset
# - options (list):
#     - methods (character[]): correlation methods
#     - alt (character): 'two.sided'|'greater'|'less'|'one.sided'
#     - use (character): 'all.obs'|'complete.obs'|'pairwise.complete.obs'
#
# Returns ParsedTable-like list(headers, rows)
RunCorrelation <- function(x, options = NULL) {
  if (is.null(options)) options <- list()

  # Validate/normalize options
  methods <- tryCatch({
    m <- options$methods
    if (is.null(m)) character(0) else as.character(m)
  }, error = function(e) character(0))
  if (length(methods) == 0) methods <- c("pearson")

  alt <- tryCatch({
    a <- options$alt
    if (is.null(a) || !nzchar(a)) "two.sided" else as.character(a)
  }, error = function(e) "two.sided")
  alt_r <- if (identical(alt, "one.sided")) "greater" else alt
  if (!alt_r %in% c("two.sided", "greater", "less")) alt_r <- "two.sided"

  use <- tryCatch({
    u <- options$use
    if (is.null(u) || !nzchar(u)) "all.obs" else as.character(u)
  }, error = function(e) "all.obs")
  if (!use %in% c("all.obs", "complete.obs", "pairwise.complete.obs")) use <- "all.obs"

  # Build combined table per selected method
  headers <- NULL
  rows_all <- list()
  for (i in seq_along(methods)) {
    m <- methods[[i]]
    res <- CorrParsed(x, method = m, use = use, alternative = alt_r)
    if (is.null(headers)) headers <- res$headers
    if (i > 1) {
      sep <- c(paste0('--- ', m, ' ---'), rep('', length(headers) - 1L))
      rows_all[[length(rows_all) + 1L]] <- sep
    }
    for (r in res$rows) rows_all[[length(rows_all) + 1L]] <- r
  }
  list(headers = headers, rows = rows_all)
}
