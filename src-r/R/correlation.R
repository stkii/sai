# Execute correlation analysis
#
# Args:
# - x (data.frame or matrix): numeric variables in columns. Non-numeric columns are not allowed.
# - mehod (character): "pearson" (default), "spearman", "kendall".
# - use (character): "all.obs" (default), "complete.obs", "pairwise.complete.obs".
.CorrTest <- function(df, method="pearson", use="all.obs", alternative="two.sided") {
  # Receive raw data.
  # Input dataset must be a data frame
  IsDataFrame(df)

  # Validation (if stop is called, frontend displays WarningDialog)
  # Check if all columns are numeric
  is_num <- if (is.data.frame(df)) base::vapply(df, is.numeric, base::logical(1)) else base::rep(TRUE, base::ncol(df))
  # 1. Reject non-numeric columns
  if (base::any(!is_num)) {
    StopWithErrCode("ERR-811")
  }
  # 2. Ensure at least two columns for correlation
  if (base::ncol(df) < 2) {
    StopWithErrCode("ERR-831")
  }

  # For speed, work in matrix form and preserve column names
  mat <- base::as.matrix(df)
  work_mat <- mat
  if (is.null(base::colnames(work_mat))) {
    base::colnames(work_mat) <- base::paste0("V", base::seq_len(base::ncol(work_mat)))
  }

   # Initialize matrix (all square matrix)
  n_col <- base::ncol(work_mat)

  # Similar to `cor(..., use = "all.obs")`
  if (use == "all.obs" && base::any(is.na(work_mat))) {
    StopWithErrCode("ERR-832")
  }

  corr_mtx <- matrix(NA_real_, n_col, n_col, dimnames=list(base::colnames(work_mat), base::colnames(work_mat))) # correlation matrix
  p_mtx <- matrix(NA_real_, n_col, n_col, dimnames=list(base::colnames(work_mat), base::colnames(work_mat)))    # p-value matrix
  t_mtx <- matrix(NA_real_, n_col, n_col, dimnames=list(base::colnames(work_mat), base::colnames(work_mat)))    # t-value matrix
  df_mtx <- matrix(NA_real_, n_col, n_col, dimnames=list(base::colnames(work_mat), base::colnames(work_mat)))   # degree of freedom matrix
  n_mtx <- matrix(NA_integer_, n_col, n_col, dimnames=list(base::colnames(work_mat), base::colnames(work_mat))) # sample size matrix

  corr_mtx <- stats::cor(work_mat, method = method, use = use)

  if (use == "complete.obs") {
    # Listwise deletion: drop any row with missing values.
    ok_all <- stats::complete.cases(work_mat)
    work_mat <- work_mat[ok_all, , drop = FALSE]
  }

  ties_approx <- FALSE
  for (i in base::seq_len(n_col)) {
    for (j in base::seq_len(n_col)) {
      if (j <= i) next

      x <- work_mat[, i]
      y <- work_mat[, j]

      if (use == "pairwise.complete.obs") {
        # Pairwise deletion: drop rows missing in this variable pair.
        ok_pair <- stats::complete.cases(x, y)
        x <- x[ok_pair]
        y <- y[ok_pair]
      }

      if (base::length(x) < 3 || base::length(y) < 3) next

      test <- base::withCallingHandlers(
        stats::cor.test(
          x,
          y,
          alternative = alternative,
          method = method,
          exact = NULL,
          continuity = FALSE
        ),
        warning = function(w) {
          if (method == "spearman" &&
              base::grepl("Cannot compute exact p-value with ties", base::conditionMessage(w), fixed = TRUE)) {
            ties_approx <<- TRUE
          }
          base::invokeRestart("muffleWarning")
        }
      )

      corr_mtx[i, j] <- unname(test$estimate)
      # corr_mtx[j, i] <- corr_mtx[i, j]

      p_mtx[i, j] <- test$p.value
      # p_mtx[j, i] <- p_mtx[i, j]

      t_mtx[i, j] <- unname(test$statistic)
      # t_mtx[j, i] <- t_mtx[i, j]

      df_mtx[i, j] <- if (method == "kendall") {
        NA_real_
      } else if (method == "spearman" && (is.null(test$parameter) || length(test$parameter) == 0)) {
        NA_real_
      } else {
        unname(test$parameter)
      }
      # df_mtx[j, i] <- df_mtx[i, j]

      n_mtx[i, j] <- base::length(x)
      # n_mtx[j, i] <- n_mtx[i, j]
    }
  }

  # Combine the results into a list
  res <- list(
    corr_mtx = corr_mtx,
    p_mtx = p_mtx,
    t_mtx = t_mtx,
    df_mtx = df_mtx,
    n_mtx = n_mtx,
    method = method,
    alternative = alternative,
    use = use,
    note = if (method == "spearman" && ties_approx) {
      "※タイが存在するため、p値は近似によって算出されました"
    } else {
      NULL
    }
  )

  return(res)
}

# Wrapper to return ParsedDataTable-compatible structure
#
# Args:
# - res (list): Output from .CorrTest()
#
# Returns:
# - list(headers=[..], rows=[[..], ...])
#
.CorrTestParsed <- function(res) {
  corr_mtx <- res$corr_mtx
  p_mtx <- res$p_mtx

  vars <- base::colnames(corr_mtx)
  if (is.null(vars)) vars <- base::paste0("V", base::seq_len(base::nrow(corr_mtx)))

  headers <- base::c("Variable", vars)

  format_corr_cell <- function(value, p_value, alt_p_value) {
    formatted <- FormatNum(value)
    if (base::is.null(formatted) || base::is.na(formatted) || !base::nzchar(formatted)) {
      return(formatted)
    }
    p_use <- p_value
    if (base::is.na(p_use)) p_use <- alt_p_value
    stars <- StarsForPval(p_use)
    if (base::nzchar(stars)) {
      base::paste0(formatted, stars)
    } else {
      formatted
    }
  }

  rows <- base::lapply(base::seq_len(base::nrow(corr_mtx)), function(i) {
    base::c(vars[[i]],
            base::vapply(base::seq_len(base::ncol(corr_mtx)), function(j) {
              if (j <= i) return("")
              p_val <- p_mtx[i, j]
              format_corr_cell(corr_mtx[i, j], p_val, p_val)
            }, base::character(1)))
  })

  list(headers = headers, rows = rows, note = res$note)
}

# Runner used by CLI dispatcher
#
# Arguments:
# - df (data.frame): numeric dataset
# - method (character): 'pearson' | 'spearman' | 'kendall'
# - use (character): 'all.obs' | 'complete.obs' | 'pairwise.complete.obs'
# - alternative (character): 'two.sided' | 'less' | 'greater'
# - view (character): reserved for future extensions
#
# Returns:
# - ParsedDataTable-like list(headers, rows)
#
RunCorrelation <- function(df, method = NULL, use = NULL, alternative = NULL, view = NULL) {
  method_norm <- base::tryCatch({
    m <- method
    if (is.null(m) || !base::nzchar(m)) "pearson" else base::tolower(base::as.character(m))
  }, error = function(e) "pearson")
  if (!method_norm %in% c("pearson", "spearman", "kendall")) method_norm <- "pearson"

  use_norm <- base::tryCatch({
    u <- use
    if (is.null(u) || !base::nzchar(u)) "all.obs" else base::tolower(base::as.character(u))
  }, error = function(e) "all.obs")
  if (!use_norm %in% c("all.obs", "complete.obs", "pairwise.complete.obs")) use_norm <- "all.obs"

  alternative_norm <- base::tryCatch({
    a <- alternative
    if (is.null(a) || !base::nzchar(a)) "two.sided" else base::tolower(base::as.character(a))
  }, error = function(e) "two.sided")
  if (!alternative_norm %in% c("two.sided", "less", "greater")) alternative_norm <- "two.sided"

  res <- .CorrTest(df, method = method_norm, use = use_norm, alternative = alternative_norm)
  .CorrTestParsed(res)
}
