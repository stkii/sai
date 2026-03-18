# =====================
# Regression analysis
# =====================

.QuoteFormulaName <- function(name) {
  value <- base::as.character(name)
  escaped <- base::gsub("`", "``", value, fixed = TRUE)
  base::paste0("`", escaped, "`")
}

.QuoteInteractionTerm <- function(term) {
  components <- base::as.character(term)
  if (base::length(components) == 1L && base::grepl(":", components[[1]], fixed = TRUE)) {
    components <- base::strsplit(components[[1]], ":", fixed = TRUE)[[1]]
  }
  quoted <- base::vapply(components, .QuoteFormulaName, base::character(1))
  base::paste(quoted, collapse = ":")
}

# Normalize manual interaction terms from JSON-deserialized input.
#
# jsonlite::fromJSON(simplifyVector = TRUE) converts nested arrays differently
# depending on shape:
#   [["A","B"],["A","C"]]  (same-length)   -> character matrix
#   [["A","B"],["A","B","C"]] (diff-length) -> list of character vectors
#   [["A","B"]]               (single)      -> character vector c("A", "B")
#
.ValidateRegressionInteractionTerms <- function(terms) {
  if (is.null(terms) || base::length(terms) == 0L) {
    return(NULL)
  }

  normalized <- base::lapply(terms, function(term) {
    components <- base::as.character(term)
    if (base::length(components) < 2L ||
        base::any(base::is.na(components)) ||
        base::any(!base::nzchar(components))) {
      StopWithErrCode("ERR-920")
    }
    components
  })

  if (base::length(normalized) == 0L) {
    return(NULL)
  }

  normalized
}

.NormalizeRegressionManualTerms <- function(terms) {
  if (is.null(terms)) {
    return(NULL)
  }

  if (base::is.matrix(terms) && base::is.character(terms)) {
    return(.ValidateRegressionInteractionTerms(base::lapply(base::seq_len(base::nrow(terms)), function(i) {
      base::as.character(terms[i, ])
    })))
  }

  if (base::is.character(terms) && !base::is.matrix(terms)) {
    return(.ValidateRegressionInteractionTerms(base::list(base::as.character(terms))))
  }

  if (base::is.list(terms)) {
    return(.ValidateRegressionInteractionTerms(base::lapply(terms, base::as.character)))
  }

  StopWithErrCode("ERR-920")
}

# Normalize interaction config from JSON-deserialized input.
#
# New payloads are structured as:
#   list(mode = "none" | "auto" | "manual", terms = list(...))
#
# Old payloads are still accepted for compatibility:
#   "none" | "auto" | c("A:B", "A:C") | list(c("A", "B"))
.NormalizeRegressionInteractions <- function(interactions) {
  if (is.null(interactions)) {
    return(NULL)
  }

  if (base::is.list(interactions) && !is.null(interactions[["mode"]])) {
    mode_values <- base::as.character(interactions[["mode"]])
    if (base::length(mode_values) == 0L || !base::nzchar(mode_values[[1]])) {
      StopWithErrCode("ERR-920")
    }
    mode <- mode_values[[1]]

    if (base::identical(mode, "none")) {
      return(NULL)
    }
    if (base::identical(mode, "auto")) {
      return("auto")
    }
    if (base::identical(mode, "manual")) {
      return(.NormalizeRegressionManualTerms(interactions[["terms"]]))
    }

    StopWithErrCode("ERR-920")
  }

  if (base::identical(interactions, "none")) {
    return(NULL)
  }
  if (base::identical(interactions, "auto")) {
    return("auto")
  }

  if (base::is.matrix(interactions) && base::is.character(interactions)) {
    return(.ValidateRegressionInteractionTerms(base::lapply(base::seq_len(base::nrow(interactions)), function(i) {
      base::as.character(interactions[i, ])
    })))
  }

  if (base::is.character(interactions) && !base::is.matrix(interactions)) {
    if (base::length(interactions) >= 2L && !base::any(base::grepl(":", interactions, fixed = TRUE))) {
      return(.ValidateRegressionInteractionTerms(base::list(base::as.character(interactions))))
    }

    terms <- base::strsplit(interactions, ":", fixed = TRUE)
    return(.ValidateRegressionInteractionTerms(terms))
  }

  if (base::is.list(interactions)) {
    return(.ValidateRegressionInteractionTerms(base::lapply(interactions, base::as.character)))
  }

  StopWithErrCode("ERR-920")
}

# Compute VIF for each predictor variable
# Each predictor column in the model matrix is regressed on the remaining
# predictor columns to get R², then VIF = 1 / (1 - R²).
.ComputeVIFs <- function(fit) {
  design_matrix <- stats::model.matrix(fit)
  predictor_names <- base::colnames(design_matrix)

  if (is.null(predictor_names) || base::length(predictor_names) == 0L) {
    return(base::setNames(base::numeric(0), base::character(0)))
  }

  non_intercept <- predictor_names != "(Intercept)"
  design_matrix <- design_matrix[, non_intercept, drop = FALSE]
  predictor_names <- base::colnames(design_matrix)

  n_vars <- base::ncol(design_matrix)
  if (is.null(predictor_names) || n_vars == 0L) {
    return(base::setNames(base::numeric(0), base::character(0)))
  }

  if (n_vars < 2L) {
    vifs <- base::setNames(1, predictor_names)
    return(vifs)
  }

  design_df <- base::as.data.frame(design_matrix, check.names = FALSE, stringsAsFactors = FALSE)
  safe_names <- base::paste0(".pred_", base::seq_len(n_vars))
  base::names(design_df) <- safe_names

  vifs <- base::numeric(n_vars)
  base::names(vifs) <- predictor_names

  for (i in base::seq_along(safe_names)) {
    current <- safe_names[[i]]
    other_vars <- safe_names[-i]
    formula_str <- base::paste(current, "~", base::paste(other_vars, collapse = " + "))
    vif_fit <- stats::lm(stats::as.formula(formula_str), data = design_df, na.action = stats::na.omit)
    r_sq <- base::summary(vif_fit)$r.squared
    vifs[[predictor_names[[i]]]] <- 1 / (1 - r_sq)
  }

  return(vifs)
}

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

  main_effect_terms <- base::vapply(independents, .QuoteFormulaName, base::character(1))
  main_effects <- base::paste(main_effect_terms, collapse = " + ")
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
    terms <- base::list()
    # 2-way interactions
    if (n_vars >= 2L) {
      terms <- base::c(terms, utils::combn(independents, 2, simplify = FALSE))
    }
    # 3-way interaction
    if (n_vars == 3L) {
      terms <- base::c(terms, utils::combn(independents, 3, simplify = FALSE))
    }
    terms
  } else if (is.list(interactions) && length(interactions) > 0) {
    # Manual specification — reorder components to match the order in
    # `independents` so that term names align with R's coefficient naming.
    base::lapply(interactions, function(x) {
      ordered <- x[base::order(base::match(x, independents))]
      base::as.character(ordered)
    })
  } else {
    NULL
  }

  dependent_term <- .QuoteFormulaName(dependent)
  formula <- base::paste(dependent_term, "~", main_effects)
  if (!is.null(interaction_terms) && length(interaction_terms) > 0) {
    interaction_formula_terms <- base::vapply(interaction_terms, .QuoteInteractionTerm, base::character(1))
    formula <- base::paste(formula, "+", base::paste(interaction_formula_terms, collapse = " + "))
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

  # Compute VIFs for predictors (using the same df, post-centering if applicable)
  vifs <- .ComputeVIFs(fit)

  ci <- stats::confint(fit, level = 0.95)

  return(
    list(
      summary = result,
      anova = anova_result,
      vifs = vifs,
      confint = ci
    )
  )
}

# Wrapper to return ParsedDataTable-compatible structure
#
# Args:
# - res (list): Output from .LinearRegression()
#
# Returns:
# - list with coefficients table, anova table, and model summary table
#
.LinearRegressionParsed <- function(res) {
  smry <- res$summary
  anova_tbl <- res$anova
  vifs <- res$vifs
  ci <- res$confint
  centered_note <- if (isTRUE(res$centered)) "説明変数が中心化されています" else NULL

  # --- Coefficients table ---
  coef_tbl <- smry$coefficients
  coef_vars <- base::rownames(coef_tbl)
  if (is.null(coef_vars)) coef_vars <- base::paste0("V", base::seq_len(base::nrow(coef_tbl)))

  coef_headers <- base::c("変数", "係数", "標準誤差", "95%下限", "95%上限", "t値", "p値", "VIF")

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
    var_name <- coef_vars[[i]]
    # VIF is not applicable for intercept
    vif_val <- if (var_name == "(Intercept)" || is.null(vifs[[var_name]])) {
      ""
    } else {
      FormatNum(vifs[[var_name]])
    }
    ci_lower <- if (!is.null(ci) && var_name %in% base::rownames(ci)) {
      FormatNum(ci[var_name, 1])
    } else {
      ""
    }
    ci_upper <- if (!is.null(ci) && var_name %in% base::rownames(ci)) {
      FormatNum(ci[var_name, 2])
    } else {
      ""
    }
    base::c(
      var_name,
      format_coef_cell(coef_tbl[i, 1], p_val),
      FormatNum(coef_tbl[i, 2]),
      ci_lower,
      ci_upper,
      FormatNum(coef_tbl[i, 3]),
      FormatPval(p_val),
      vif_val
    )
  })

  coefficients <- base::list(headers = coef_headers, rows = coef_rows)
  if (!is.null(centered_note)) {
    coefficients$note <- centered_note
  }

  # --- ANOVA table ---
  # Aggregate anova(fit) into Model / Residual / Total rows.
  # anova(fit) returns per-predictor rows + Residuals as last row.
  n_anova_rows <- base::nrow(anova_tbl)
  resid_idx <- n_anova_rows  # last row is always Residuals
  model_idxs <- base::seq_len(n_anova_rows - 1L)

  model_ss <- base::sum(anova_tbl[model_idxs, "Sum Sq"])
  model_df <- base::sum(anova_tbl[model_idxs, "Df"])
  model_ms <- model_ss / model_df
  resid_ss <- anova_tbl[resid_idx, "Sum Sq"]
  resid_df <- anova_tbl[resid_idx, "Df"]
  resid_ms <- anova_tbl[resid_idx, "Mean Sq"]
  total_ss <- model_ss + resid_ss
  total_df <- model_df + resid_df

  # F and p from summary (overall model test)
  f_stat <- smry$fstatistic
  if (!is.null(f_stat)) {
    model_f <- f_stat[["value"]]
    model_p <- stats::pf(model_f, f_stat[["numdf"]], f_stat[["dendf"]], lower.tail = FALSE)
  } else {
    model_f <- NA_real_
    model_p <- NA_real_
  }

  anova_headers <- base::c("", "平方和", "自由度", "平均平方", "F値", "有意確率")

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

  anova_rows <- base::list(
    base::c(
      "モデル",
      FormatNum(model_ss),
      base::as.character(base::as.integer(model_df)),
      FormatNum(model_ms),
      format_f_cell(model_f, model_p),
      FormatPval(model_p)
    ),
    base::c(
      "残差",
      FormatNum(resid_ss),
      base::as.character(base::as.integer(resid_df)),
      FormatNum(resid_ms),
      "",
      ""
    ),
    base::c(
      "合計",
      FormatNum(total_ss),
      base::as.character(base::as.integer(total_df)),
      "",
      "",
      ""
    )
  )

  anova <- base::list(headers = anova_headers, rows = anova_rows)

  # --- Model summary table ---
  n_obs <- base::as.integer(smry$df[1] + smry$df[2])
  model_summary_headers <- base::c("サンプルサイズ", "R²", "調整済みR²", "標準誤差")
  model_summary_rows <- base::list(
    base::c(
      base::as.character(n_obs),
      FormatNum(smry$r.squared),
      FormatNum(smry$adj.r.squared),
      FormatNum(smry$sigma)
    )
  )
  model_summary <- base::list(headers = model_summary_headers, rows = model_summary_rows)

  base::list(model_summary = model_summary, coefficients = coefficients, anova = anova)
}

# Runner used by CLI dispatcher
#
# Arguments:
# - df (data.frame): numeric dataset
# - dependent (character): dependent variable name
# - independent (character vector): independent variable names
# - interactions (list): list(mode = "none" | "auto" | "manual", terms = list(...))
# - intercept (logical): whether to include intercept (default TRUE)
# - center (logical): whether to center independent variables (default FALSE)
#
# Returns:
# - list with:
#   - coefficients: ParsedDataTable (headers, rows) for regression coefficients
#   - anova: ParsedDataTable (headers, rows) for ANOVA table
#   - model_summary: ParsedDataTable (headers, rows) for model summary
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

  # Ensure referenced columns exist before formula construction.
  if (!dep_norm %in% base::colnames(df)) {
    StopWithErrCode("ERR-920")
  }
  if (base::any(!indep_norm %in% base::colnames(df))) {
    StopWithErrCode("ERR-920")
  }

  # Minimum rows: number of parameters + 1 (intercept counted if present)
  n_params <- base::length(indep_norm) + if (isTRUE(intercept)) 1L else 0L
  ValidateMinRows(df, n_params + 1L)

  inter_norm <- .NormalizeRegressionInteractions(interactions)

  if (is.list(inter_norm) && base::length(inter_norm) > 0) {
    inter_vars <- base::unique(base::unlist(inter_norm, use.names = FALSE))
    if (base::any(!inter_vars %in% base::colnames(df))) {
      StopWithErrCode("ERR-920")
    }
  }

  intercept_norm <- .NormalizeLogicalOption(intercept, default = TRUE)
  center_norm <- .NormalizeLogicalOption(center, default = FALSE)

  res <- .LinearRegression(
    df,
    dependent = dep_norm,
    independents = indep_norm,
    interactions = inter_norm,
    intercept = intercept_norm,
    center = center_norm
  )

  res$centered <- isTRUE(center_norm)
  .LinearRegressionParsed(res)
}
