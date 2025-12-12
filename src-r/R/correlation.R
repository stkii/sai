# Execute correlation analysis
#
# Args:
# - x (data.frame or matrix): numeric variables in columns. Non-numeric columns are not allowed.
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
.CorrTest <- function(x, method="pearson", use="all.obs", alternative="two.sided") {
  # Receive raw data.
  # Input dataset must be a data frame
  IsDataFrame(x)

  # Validation (if stop is called, frontend displays WarningDialog)
  # Check if all columns are numeric
  is_num <- if (is.data.frame(x)) base::vapply(x, is.numeric, base::logical(1)) else base::rep(TRUE, base::ncol(x))
  # 1. Reject non-numeric columns
  if (base::any(!is_num)) {
    StopWithErrCode("ERR-811")
  }
  # 2. Ensure at least two columns for correlation
  if (base::ncol(x) < 2) {
    StopWithErrCode("ERR-831")
  }

  # For speed, work in matrix form and preserve column names
  x_mat <- base::as.matrix(x)
  colnames_x <- base::colnames(x_mat)
  if (is.null(colnames_x)) colnames_x <- base::paste0("V", base::seq_len(base::ncol(x_mat)))

  x_work <- x_mat

  # Initialize matrix (all square matrix)
  n_col <- base::ncol(x_work)
  col_names <- base::colnames(x_work)

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
      if (alt == "greater") return(base::ifelse(t_val > 0, 0, 1)) # Right-sided test
      if (alt == "less") return(base::ifelse(t_val < 0, 0, 1))    # Left-sided test
    }

    # Calculate p-value using the t-distribution
    if (alt == "two.sided") {
      # Two-sided test: P(|T| > |t|) = 2 * P(T < -|t|)
      return(2 * stats::pt(-base::abs(t_val), df))
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
    n_mtx[,] <- base::nrow(x_work)
  } else if (use == "complete.obs") {
    # With 'complete.obs', only rows with no missing values at all are used.
    # Therefore, the effective sample size (n_complete) is the same for all variable pairs.
    n_complete <- base::sum(stats::complete.cases(x_work))
    n_mtx[,] <- n_complete
  } else { # pairwise.complete.obs
    m <- !is.na(x_work)
    N_num <- base::t(m) %*% m  # Number of non-missing values for each pair
    n_mtx[,] <- N_num
    base::storage.mode(n_mtx) <- "integer"
  }

  if (use == "pairwise.complete.obs") {
    for (i in base::seq_len(n_col)) n_mtx[i, i] <- base::sum(!is.na(x_work[, i]))
  }

  # t-statistic, degree of freedom, and p-value calculation (derived from corr_mtx and n_mtx)
  for (i in base::seq_len(n_col)) {
    # Diagonal elements
    corr_mtx[i, i] <- 1
    p_mtx[i, i] <- NA_real_
    t_mtx[i, i] <- NA_real_
    df_mtx[i, i] <- NA_real_
  }

  # non-diagonal elements
  if (n_col >= 2) {
    for (i in base::seq_len(n_col - 1L)) {
      for (j in base::seq.int(i + 1L, n_col)) {
        r <- corr_mtx[i, j]
        n <- base::as.numeric(n_mtx[i, j])
        df <- if (!is.na(n) && n >= 3) n - 2 else NA_real_
        t_val <- NA_real_
        if (!is.na(r) && !is.na(n) && n >= 3) {
          if (is.finite(r)) {
            if (base::abs(r) < 1) {
              t_val <- r * base::sqrt((n - 2) / (1 - r^2))
            } else {
              t_val <- base::sign(r) * Inf
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

  return (res)
}

# Wrapper to return ParsedTable-compatible structure for UI
# - Shows an upper-triangular correlation matrix with significance stars
# - headers: c("Variable", varnames)
# - cells: diagonal = FormatNum(1.0); upper triangle = paste0(FormatNum(r), stars); lower triangle = ""
.CorrParsed <- function(x, method="pearson", use="all.obs", alternative="two.sided") {
  res <- .CorrTest(x, method=method, use=use, alternative=alternative)
  corr <- res$corr
  pval <- res$p

  vars <- base::colnames(corr)
  if (is.null(vars)) vars <- base::paste0("V", base::seq_len(base::ncol(corr)))

  headers <- c("Variable", vars)
  n <- base::length(vars)

  # Upper-triangular correlation rows (existing behavior)
  rows_corr <- base::lapply(base::seq_len(n), function(i) {
    row_vals <- base::character(n + 1)
    row_vals[[1]] <- vars[[i]]
    for (j in base::seq_len(n)) {
      if (j < i) {
        row_vals[[j + 1]] <- "" # lower triangle blank
      } else if (j == i) {
        row_vals[[j + 1]] <- FormatNum(1.0) # diagonal
      } else {
        r <- corr[i, j]
        p <- pval[i, j]
        if (is.na(r)) {
          row_vals[[j + 1]] <- FormatNum(1.0)
        } else {
          row_vals[[j + 1]] <- base::paste0(FormatNum(r), StarsForPval(p))
        }
      }
    }
    row_vals
  })

  # Separator row to label p-values block
  sep_row <- c("p-value", base::rep("", n))

  # Upper-triangular p-value rows (3 decimals, rounded; <.001 rule applied)
  rows_p <- base::lapply(base::seq_len(n), function(i) {
    row_vals <- base::character(n + 1)
    row_vals[[1]] <- vars[[i]]
    for (j in base::seq_len(n)) {
      if (j < i) {
        row_vals[[j + 1]] <- "" # lower triangle blank
      } else if (j == i) {
        # 対角のp値は未定義 -> "-"
        row_vals[[j + 1]] <- "-"
      } else {
        p <- pval[i, j]
        row_vals[[j + 1]] <- FormatPval(p)
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
# - methods (character[]): correlation methods (NULL or empty -> default "pearson")
# - alt (character): 'two.sided'|'greater'|'less'|'one.sided' (NULL/empty -> 'two.sided')
# - use (character): 'all.obs'|'complete.obs'|'pairwise.complete.obs' (NULL/empty -> 'all.obs')
#
# Returns ParsedTable-like list(headers, rows)
RunCorrelation <- function(x, methods = NULL, alt = NULL, use = NULL) {
  # Validate/normalize options passed as individual arguments
  methods <- base::tryCatch({
    m <- methods
    if (is.null(m)) base::character(0) else base::as.character(m)
  }, error = function(e) base::character(0))
  if (base::length(methods) == 0) methods <- c("pearson")

  alt <- base::tryCatch({
    a <- alt
    if (is.null(a) || !base::nzchar(a)) "two.sided" else base::as.character(a)
  }, error = function(e) "two.sided")
  alt_r <- if (base::identical(alt, "one.sided")) "greater" else alt
  if (!alt_r %in% c("two.sided", "greater", "less")) alt_r <- "two.sided"

  use <- base::tryCatch({
    u <- use
    if (is.null(u) || !base::nzchar(u)) "all.obs" else base::as.character(u)
  }, error = function(e) "all.obs")
  if (!use %in% c("all.obs", "complete.obs", "pairwise.complete.obs")) use <- "all.obs"

  # Build combined table per selected method
  headers <- NULL
  rows_all <- list()
  for (i in base::seq_along(methods)) {
    m <- methods[[i]]
    res <- .CorrParsed(x, method = m, use = use, alternative = alt_r)
    if (is.null(headers)) headers <- res$headers
    if (i > 1) {
      sep <- c(base::paste0('--- ', m, ' ---'), base::rep('', base::length(headers) - 1L))
      rows_all[[base::length(rows_all) + 1L]] <- sep
    }
    for (r in res$rows) rows_all[[base::length(rows_all) + 1L]] <- r
  }
  list(headers = headers, rows = rows_all)
}
