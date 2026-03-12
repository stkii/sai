# ======================
# ANOVA analysis
# ======================

# Execute ANOVA (Analysis of Variance)
#
# Args:
# - df (data.frame): dataset
# - dependent (character): dependent variable name
# - independents (character vector): independent variable names
# - factors (character vector): variables to convert to factor
#
# Returns:
# - list with summary (anova table from summary(aov(...)))
#
.Anova <- function(df, dependent, independents, factors = NULL) {
  IsDataFrame(df)

  if (!is.null(factors) && base::length(factors) > 0L) {
    for (col in factors) {
      df[[col]] <- base::as.factor(df[[col]])
    }
  }

  dependent_term <- base::paste0("`", base::gsub("`", "``", dependent, fixed = TRUE), "`")
  indep_terms <- base::vapply(independents, function(v) {
    base::paste0("`", base::gsub("`", "``", v, fixed = TRUE), "`")
  }, base::character(1))

  formula_str <- base::paste(dependent_term, "~", base::paste(indep_terms, collapse = " * "))
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

  headers <- base::c("要因", "自由度", "平方和", "平均平方", "F値", "p値")

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
      df_val,
      ss_val,
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
# - independent (character vector): independent variable names
# - factors (character vector): variables to convert to factor (subset of independent).
#     If NULL or empty, all independent variables are treated as factors.
#
# Returns:
# - ParsedDataTable-like list(headers, rows)
#
RunAnova <- function(df, dependent = NULL, independent = NULL, factors = NULL) {
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

  factors_norm <- if (is.null(factors) || base::length(factors) == 0L) {
    indep_norm
  } else {
    f <- base::as.character(factors)
    if (base::any(!f %in% indep_norm)) {
      StopWithErrCode("ERR-920")
    }
    f
  }

  res <- .Anova(df, dependent = dep_norm, independents = indep_norm, factors = factors_norm)
  .AnovaParsed(res)
}
