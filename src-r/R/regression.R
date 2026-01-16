.LinearRegression <- function(df,
                              dependent,
                              independents,
                              interactions = NULL,
                              intercept = TRUE,
                              weights = NULL,
                              na_action = "na.omit",
                              center = FALSE) {
  # Receive raw data.
  # Input dataset must be a data frame
  IsDataFrame(df)

  # Optionally center independent variables (and interaction terms) only
  if (isTRUE(center)) {
    # Center only base variables that actually exist as columns
    center_cols <- base::intersect(independents, colnames(df))
    if (base::length(center_cols) > 0L) {
      df <- CenterVariables(df, columns = center_cols, na_ignore = TRUE)
    }
  }

  main_effects <- paste(independents, collapse = " + ")
  if (!isTRUE(intercept)) {
    # Remove intercept via '0 +' (same as '-1')
    main_effects <- base::paste("0 +", main_effects)
  }

  interaction_terms <- if(identical(interactions, "auto")) {
    # Auto generate all interactions (2-way and 3-way) for up to 3 independent variables
    n_vars <- base::length(independents)
    if (n_vars > 3L) {
      base::stop("交互作用の自動生成は独立変数3つまでです")
    }
    terms <- character(0)
    # 2-way interactions
    if (n_vars >= 2L) {
      terms <- c(terms, combn(independents, 2, function(x) paste(x, collapse = ":"), simplify = TRUE))
    }
    # 3-way interaction
    if (n_vars == 3L) {
      terms <- c(terms, combn(independents, 3, function(x) paste(x, collapse = ":"), simplify = TRUE))
    }
    terms
  } else if (is.list(interactions) && length(interactions) > 0) {
    # Manual specification
    sapply(interactions, function(x) paste(x, collapse = ":"))
  } else {
    NULL
  }

  formula <- paste(dependent, "~", main_effects)
  if (!is.null(interaction_terms) && length(interaction_terms) > 0) {
    formula <- base::paste(formula, "+", paste(interaction_terms, collapse = " + "))
  }

  na_fun <- switch(base::as.character(na_action),
                   "na.exclude" = stats::na.exclude,
                   "na.fail"    = stats::na.fail,
                   stats::na.omit)

  # Fit the linear model
  fit <- lm(stats::as.formula(formula),
            data = df,
            weights = weights,
            na.action = na_fun,
            x = FALSE,
            y = FALSE,
            # NEED to calculate the coeffcients. DO NOT set to FALSE.
            qr = TRUE
  )

  result <- summary(fit)
  anova_result <- anova(fit)

  return(
    list(
      summary = result,
      anova = anova_result
    )
  )
}

# Wrapper to return ParsedDataTable-compatible structure
#
# Args:
# - res (list): Output from .LinearRegression()
#
# Returns:
# - list with coefficients table, anova table, and model info
#
.LinearRegressionParsed <- function(res) {
  smry <- res$summary
  anova_tbl <- res$anova

  # --- Coefficients table ---
  coef_tbl <- smry$coefficients
  coef_vars <- base::rownames(coef_tbl)
  if (is.null(coef_vars)) coef_vars <- base::paste0("V", base::seq_len(base::nrow(coef_tbl)))

  coef_headers <- base::c("変数", "係数", "標準誤差", "t値", "p値")

  format_coef_cell <- function(value, p_value) {
    formatted <- FormatNum(value)
    if (base::is.null(formatted) || base::is.na(formatted) || !base::nzchar(formatted)) {
      return(formatted)
    }
    stars <- StarsForPval(p_value)
    if (base::nzchar(stars)) {
      base::paste0(formatted, stars)
    } else {
      formatted
    }
  }

  coef_rows <- base::lapply(base::seq_len(base::nrow(coef_tbl)), function(i) {
    p_val <- coef_tbl[i, 4]
    base::c(
      coef_vars[[i]],
      format_coef_cell(coef_tbl[i, 1], p_val),
      FormatNum(coef_tbl[i, 2]),
      FormatNum(coef_tbl[i, 3]),
      FormatNum(p_val)
    )
  })

  coefficients <- base::list(headers = coef_headers, rows = coef_rows)

  # --- ANOVA table ---
  # anova(fit) returns: Df, Sum Sq, Mean Sq, F value, Pr(>F)
  anova_vars <- base::rownames(anova_tbl)
  if (is.null(anova_vars)) anova_vars <- base::paste0("V", base::seq_len(base::nrow(anova_tbl)))

  anova_headers <- base::c("要因", "自由度", "平方和", "平均平方", "F値", "p値")

  format_f_cell <- function(value, p_value) {
    formatted <- FormatNum(value)
    if (base::is.null(formatted) || base::is.na(formatted) || !base::nzchar(formatted)) {
      return(formatted)
    }
    stars <- StarsForPval(p_value)
    if (base::nzchar(stars)) {
      base::paste0(formatted, stars)
    } else {
      formatted
    }
  }

  anova_rows <- base::lapply(base::seq_len(base::nrow(anova_tbl)), function(i) {
    f_val <- anova_tbl[i, "F value"]
    p_val <- anova_tbl[i, "Pr(>F)"]
    base::c(
      anova_vars[[i]],
      base::as.character(base::as.integer(anova_tbl[i, "Df"])),
      FormatNum(anova_tbl[i, "Sum Sq"]),
      FormatNum(anova_tbl[i, "Mean Sq"]),
      format_f_cell(f_val, p_val),
      FormatNum(p_val)
    )
  })

  anova <- base::list(headers = anova_headers, rows = anova_rows)

  # --- Model statistics ---
  r_sq <- smry$r.squared
  adj_r_sq <- smry$adj.r.squared
  f_stat <- smry$fstatistic
  n_obs <- base::length(smry$residuals)

  model_info <- base::list(
    r_squared = FormatNum(r_sq),
    adj_r_squared = FormatNum(adj_r_sq),
    n = n_obs
  )

  if (!is.null(f_stat) && base::length(f_stat) >= 3) {
    f_val <- f_stat[[1]]
    df1 <- f_stat[[2]]
    df2 <- f_stat[[3]]
    f_pval <- stats::pf(f_val, df1, df2, lower.tail = FALSE)
    model_info$f_statistic <- FormatNum(f_val)
    model_info$f_df1 <- df1
    model_info$f_df2 <- df2
    model_info$f_pvalue <- FormatNum(f_pval)
  }

  base::list(coefficients = coefficients, anova = anova, model = model_info)
}

# Runner used by CLI dispatcher
#
# Arguments:
# - df (data.frame): numeric dataset
# - dependent (character): dependent variable name
# - independent (character vector): independent variable names
# - interactions (character or list): "auto" | "none" | list of pairs
# - intercept (logical): whether to include intercept (default TRUE)
# - center (logical): whether to center independent variables (default FALSE)
#
# Returns:
# - list with:
#   - coefficients: ParsedDataTable (headers, rows) for regression coefficients
#   - anova: ParsedDataTable (headers, rows) for ANOVA table
#   - model: model statistics (r_squared, adj_r_squared, n, f_statistic, etc.)
#
RunRegression <- function(df,
                          dependent = NULL,
                          independent = NULL,
                          interactions = NULL,
                          intercept = TRUE,
                          center = FALSE) {
  if (is.null(dependent) || !base::nzchar(dependent)) {
    base::stop("従属変数が指定されていません")
  }
  if (is.null(independent) || base::length(independent) == 0) {
    base::stop("独立変数が指定されていません")
  }

  dep_norm <- base::as.character(dependent)
  indep_norm <- base::as.character(independent)

  inter_norm <- if (is.null(interactions) || identical(interactions, "none")) {
    NULL
  } else if (identical(interactions, "auto")) {
    "auto"
  } else if (is.list(interactions)) {
    interactions
  } else {
    NULL
  }

  intercept_norm <- base::tryCatch({
    if (is.null(intercept)) TRUE else base::as.logical(intercept)[[1]]
  }, error = function(e) TRUE)
  if (base::is.na(intercept_norm)) intercept_norm <- TRUE

  center_norm <- base::tryCatch({
    if (is.null(center)) FALSE else base::as.logical(center)[[1]]
  }, error = function(e) FALSE)
  if (base::is.na(center_norm)) center_norm <- FALSE

  res <- .LinearRegression(
    df,
    dependent = dep_norm,
    independents = indep_norm,
    interactions = inter_norm,
    intercept = intercept_norm,
    center = center_norm
  )

  .LinearRegressionParsed(res)
}
