# ======================
# ANOVA analysis
# ======================

# Quote a variable name for safe use in formulas
.QuoteTerm <- function(v) {
  base::paste0("`", base::gsub("`", "``", v, fixed = TRUE), "`")
}

# Convert an ANOVA numeric column safely and reject non-numeric / non-finite values.
.NormalizeAnovaNumericColumn <- function(values, column_name, role_label) {
  raw_chr <- base::as.character(values)
  trimmed <- ifelse(base::is.na(raw_chr), "", base::trimws(raw_chr))
  converted <- suppressWarnings(base::as.numeric(trimmed))

  invalid <- trimmed != "" & (base::is.na(converted) | !base::is.finite(converted))
  if (base::any(invalid)) {
    base::stop(base::paste0(
      "ERR-855: ",
      role_label,
      " '",
      column_name,
      "' must contain only finite numeric values"
    ))
  }

  converted
}

# Normalize interaction terms from JSON-deserialized input.
#
# jsonlite::fromJSON(simplifyVector = TRUE) converts nested arrays differently
# depending on shape:
#   [["A","B"],["A","C"]]  (same-length)   → character matrix  (2x2)
#   [["A","B"],["A","B","C"]] (diff-length) → list of character vectors
#   [["A","B"]]               (single)      → character vector  c("A","B")
#
# This function normalizes all cases to a list of character vectors,
# or returns "factor_only" unchanged.
#
.NormalizeInteractions <- function(interactions) {
  if (base::identical(interactions, "factor_only")) {
    return("factor_only")
  }

  # Same-length inner arrays → character matrix
  if (base::is.matrix(interactions) && base::is.character(interactions)) {
    return(base::lapply(base::seq_len(base::nrow(interactions)), function(i) {
      base::as.character(interactions[i, ])
    }))
  }

  # Single inner array → simplified to plain character vector
  if (base::is.character(interactions) && !base::is.matrix(interactions)) {
    if (base::length(interactions) >= 2L) {
      return(base::list(base::as.character(interactions)))
    }
    return(base::list())
  }

  # Different-length inner arrays → already a list
  if (base::is.list(interactions)) {
    return(interactions)
  }

  base::list()
}

# Build an ANOVA formula string from factors, covariates, and interaction spec.
#
# interactions (after normalization):
#   "factor_only" — factors joined with *, covariates added with +
#   list of character vectors — main effects for all variables, then each
#     vector becomes a : interaction term
#
.BuildAnovaFormula <- function(dependent, factors, covariates, interactions) {
  dep_term <- .QuoteTerm(dependent)
  factor_terms <- base::vapply(factors, .QuoteTerm, base::character(1))
  cov_terms <- base::vapply(covariates, .QuoteTerm, base::character(1))

  if (base::identical(interactions, "factor_only")) {
    # Y ~ A * B + C  (factors get full interaction, covariates main-effect only)
    parts <- base::character(0)
    if (base::length(factor_terms) > 0L) {
      parts <- base::c(parts, base::paste(factor_terms, collapse = " * "))
    }
    if (base::length(cov_terms) > 0L) {
      parts <- base::c(parts, cov_terms)
    }
    rhs <- base::paste(parts, collapse = " + ")
  } else {
    # Manual interaction terms (interactions is a normalized list here)
    all_terms <- base::c(factor_terms, cov_terms)
    rhs <- base::paste(all_terms, collapse = " + ")

    if (base::is.list(interactions) && base::length(interactions) > 0L) {
      interaction_strs <- base::vapply(interactions, function(term) {
        base::paste(base::vapply(term, .QuoteTerm, base::character(1)), collapse = ":")
      }, base::character(1))
      rhs <- base::paste(rhs, "+", base::paste(interaction_strs, collapse = " + "))
    }
  }

  base::paste(dep_term, "~", rhs)
}

# Execute ANOVA (Analysis of Variance)
#
# When the dataset is string_mixed, every column arrives as character.
# This function converts columns to their correct types:
#   - dependent → as.numeric (ANOVA requires a numeric outcome)
#   - factors   → as.factor  (categorical grouping variables)
#   - covariates → as.numeric (continuous control variables)
#
.Anova <- function(df, dependent, factors = character(0), covariates = character(0),
                   interactions = "factor_only") {
  IsDataFrame(df)

  # Ensure dependent is numeric and reject invalid coercions explicitly.
  df[[dependent]] <- .NormalizeAnovaNumericColumn(df[[dependent]], dependent, "dependent variable")

  if (base::length(factors) > 0L) {
    for (col in factors) {
      df[[col]] <- base::as.factor(df[[col]])
    }
  }

  # Ensure covariates are numeric and reject invalid coercions explicitly.
  if (base::length(covariates) > 0L) {
    for (col in covariates) {
      df[[col]] <- .NormalizeAnovaNumericColumn(df[[col]], col, "covariate")
    }
  }

  formula_str <- .BuildAnovaFormula(dependent, factors, covariates, interactions)
  fit <- stats::aov(stats::as.formula(formula_str), data = df)
  smry <- base::summary(fit)

  list(summary = smry[[1]])
}

# Wrapper to return ParsedDataTable-compatible structure
#
# Args:
# - res (list): Output from .Anova()
#
# Returns:
# - list(headers=[..], rows=[[..], ...])
#
.AnovaParsed <- function(res) {
  tbl <- res$summary

  term_names <- base::rownames(tbl)
  if (is.null(term_names)) term_names <- base::paste0("V", base::seq_len(base::nrow(tbl)))

  headers <- base::c("要因", "平方和", "自由度", "平均平方", "F値", "p値")

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

  rows <- base::lapply(base::seq_len(base::nrow(tbl)), function(i) {
    term <- base::trimws(term_names[[i]])
    df_val <- base::as.character(base::as.integer(tbl[i, "Df"]))
    ss_val <- FormatNum(tbl[i, "Sum Sq"])
    ms_val <- FormatNum(tbl[i, "Mean Sq"])
    f_val <- tbl[i, "F value"]
    p_val <- tbl[i, "Pr(>F)"]
    base::c(
      term,
      ss_val,
      df_val,
      ms_val,
      format_f_cell(f_val, p_val),
      FormatPval(p_val)
    )
  })

  list(headers = headers, rows = rows, note = "***p < .001, **p < .01, *p < .05")
}

# Runner used by CLI dispatcher
#
# Arguments:
# - df (data.frame): dataset
# - dependent (character): dependent variable name
# - independent (character vector): all independent variable names
# - factors (character vector): variables to convert to factor (subset of independent)
# - covariates (character vector): covariate variable names (subset of independent)
# - interactions: "factor_only" (default) or list/matrix/vector of interaction terms
#
# Returns:
# - ParsedDataTable-like list(headers, rows)
#
RunAnova <- function(df, dependent = NULL, independent = NULL, factors = NULL,
                     covariates = NULL, interactions = "factor_only") {
  if (is.null(dependent) || !base::nzchar(dependent)) {
    base::stop("従属変数が指定されていません")
  }
  if (is.null(independent) || base::length(independent) == 0) {
    base::stop("独立変数が指定されていません")
  }

  dep_norm <- base::as.character(dependent)
  indep_norm <- base::as.character(independent)

  if (!dep_norm %in% base::colnames(df)) {
    StopWithErrCode("ERR-920")
  }
  if (base::any(!indep_norm %in% base::colnames(df))) {
    StopWithErrCode("ERR-920")
  }

  # [Fix P1-b] Empty factors = no factors, not "all independent".
  factors_norm <- if (is.null(factors) || base::length(factors) == 0L) {
    base::character(0)
  } else {
    f <- base::as.character(factors)
    if (base::any(!f %in% indep_norm)) {
      StopWithErrCode("ERR-920")
    }
    f
  }

  cov_norm <- if (is.null(covariates) || base::length(covariates) == 0L) {
    base::character(0)
  } else {
    cv <- base::as.character(covariates)
    if (base::any(!cv %in% indep_norm)) {
      StopWithErrCode("ERR-920")
    }
    cv
  }

  # [Fix P2] Normalize interactions before passing to .Anova / .BuildAnovaFormula.
  inter_norm <- .NormalizeInteractions(interactions)

  # Validate manual interaction variables exist in independent set
  if (base::is.list(inter_norm) && base::length(inter_norm) > 0L) {
    all_inter_vars <- base::unlist(inter_norm)
    if (base::any(!all_inter_vars %in% indep_norm)) {
      StopWithErrCode("ERR-920")
    }
  }

  res <- .Anova(df,
                dependent = dep_norm,
                factors = factors_norm,
                covariates = cov_norm,
                interactions = inter_norm)
  .AnovaParsed(res)
}
