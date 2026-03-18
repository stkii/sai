# ======================
# Correlation analysis
# ======================

# Execute correlation analysis
#
# Args:
# - x (data.frame or matrix): numeric variables in columns. Non-numeric columns are not allowed.
# - mehod (character): "pearson" (default), "spearman", "kendall".
# - use (character): "complete.obs" (default), "pairwise.complete.obs", "mean_imp".
.CorrTest <- function(df, method="pearson", use="complete.obs", alternative="two.sided") {
  use_input <- use
  if (identical(use, "mean_imp")) {
    df <- ImputeMean(df)
    use <- "pairwise.complete.obs"
  }

  corr_res <- .PrepareCorrelation(df, method = method, use = use)
  work_mat <- corr_res$work_mat
  corr_mtx <- corr_res$corr_mtx
  n_col <- corr_res$n_col
  col_names <- base::colnames(work_mat)

  # Initialize matrix (all square matrix)
  p_mtx <- matrix(NA_real_, n_col, n_col, dimnames=list(col_names, col_names))    # p-value matrix
  t_mtx <- matrix(NA_real_, n_col, n_col, dimnames=list(col_names, col_names))    # t-value matrix
  df_mtx <- matrix(NA_real_, n_col, n_col, dimnames=list(col_names, col_names))   # degree of freedom matrix
  n_mtx <- matrix(NA_integer_, n_col, n_col, dimnames=list(col_names, col_names)) # sample size matrix

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
    use = use_input,
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
  t_mtx <- res$t_mtx
  note_sig <- "***p < .001, **p < .01, *p < .05"

  vars <- base::colnames(corr_mtx)
  if (is.null(vars)) vars <- base::paste0("V", base::seq_len(base::nrow(corr_mtx)))

  headers <- base::c("変数", vars)

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

  # --- Correlation matrix table ---
  corr_rows <- base::lapply(base::seq_len(base::nrow(corr_mtx)), function(i) {
    base::c(vars[[i]],
            base::vapply(base::seq_len(base::ncol(corr_mtx)), function(j) {
              if (j <= i) return("")
              p_val <- p_mtx[i, j]
              format_corr_cell(corr_mtx[i, j], p_val, p_val)
            }, base::character(1)))
  })

  correlation <- list(headers = headers, rows = corr_rows)
  if (!is.null(res$note)) {
    correlation$note <- base::paste(res$note, note_sig, sep = " / ")
  } else {
    correlation$note <- note_sig
  }
  correlation$title <- "相関行列"

  # --- t-value matrix table ---
  t_rows <- base::lapply(base::seq_len(base::nrow(t_mtx)), function(i) {
    base::c(vars[[i]],
            base::vapply(base::seq_len(base::ncol(t_mtx)), function(j) {
              if (j <= i) return("")
              FormatNum(t_mtx[i, j])
            }, base::character(1)))
  })

  t_values <- list(headers = headers, rows = t_rows)
  t_values$title <- "統計量（t値）"

  list(correlation = correlation, t_values = t_values)
}

# Runner used by CLI dispatcher
#
# Arguments:
# - df (data.frame): numeric dataset
# - method (character): 'pearson' | 'spearman' | 'kendall'
# - use (character): 'complete.obs' | 'pairwise.complete.obs' | 'mean_imp'
# - alternative (character): 'two.sided' | 'less' | 'greater'
# - view (character): reserved for future extensions
#
# Returns:
# - ParsedDataTable-like list(headers, rows)
#
RunCorrelation <- function(df, method = NULL, use = NULL, alternative = NULL, view = NULL) {
  method_norm <- .ValidateOptionInSet(method, c("pearson", "spearman", "kendall"))
  use_norm <- .ValidateOptionInSet(use, c("complete.obs", "pairwise.complete.obs", "mean_imp"))
  alternative_norm <- .ValidateOptionInSet(alternative, c("two.sided", "less", "greater"))
  ValidateMinRows(df, 3L)

  res <- .CorrTest(df, method = method_norm, use = use_norm, alternative = alternative_norm)
  parsed <- .CorrTestParsed(res)

  # Effective sample size depends on the missing-data strategy:
  #   - complete.obs: listwise deletion — N = number of fully complete rows.
  #     This is the true effective N used for every pair.
  #   - pairwise.complete.obs: each variable pair may use a different subset
  #     of rows, so there is no single effective N. We report nrow(df) as
  #     the total dataset size and attach n_note to alert the user.
  #   - mean_imp: missing values are replaced by column means before
  #     analysis, so all nrow(df) rows participate in every pair.
  parsed$n <- if (base::identical(use_norm, "complete.obs")) {
    base::as.integer(base::sum(stats::complete.cases(df)))
  } else {
    base::as.integer(base::nrow(df))
  }
  n_total <- base::as.integer(base::nrow(df))
  parsed$n_note <- if (base::identical(use_norm, "pairwise.complete.obs")) {
    "ペアワイズ削除のため、変数ペアごとにサンプルサイズが異なる場合があります"
  } else if (base::identical(use_norm, "complete.obs") && parsed$n < n_total) {
    base::paste0("リストワイズ削除により、", n_total - parsed$n, "件の観測が除外されました")
  } else {
    NULL
  }
  parsed
}
