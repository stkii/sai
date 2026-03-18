# ======================
# ANOVA analysis (extended)
# ======================
# Supports between-subjects, within-subjects (repeated measures),
# and mixed-design (between + within) ANOVA using stats::aov().

# ---- Helpers ----

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
#   [["A","B"],["A","C"]]  (same-length)   -> character matrix  (2x2)
#   [["A","B"],["A","B","C"]] (diff-length) -> list of character vectors
#   [["A","B"]]               (single)      -> character vector  c("A","B")
#
# This function normalizes all cases to a list of character vectors,
# or returns "all" unchanged.
#
.NormalizeInteractions <- function(interactions) {
  if (base::identical(interactions, "all") || base::identical(interactions, "factor_only")) {
    return("all")
  }

  # Same-length inner arrays -> character matrix
  if (base::is.matrix(interactions) && base::is.character(interactions)) {
    return(base::lapply(base::seq_len(base::nrow(interactions)), function(i) {
      base::as.character(interactions[i, ])
    }))
  }

  # Single inner array -> simplified to plain character vector
  if (base::is.character(interactions) && !base::is.matrix(interactions)) {
    if (base::length(interactions) >= 2L) {
      return(base::list(base::as.character(interactions)))
    }
    return(base::list())
  }

  # Different-length inner arrays -> already a list
  if (base::is.list(interactions)) {
    return(interactions)
  }

  base::list()
}

# ---- Descriptive Statistics ----

# Compute descriptive statistics (n, mean, sd) for each cell defined by factors.
.DescriptiveByCell <- function(df, dependent, between_factors, within_factors) {
  all_factors <- base::c(between_factors, within_factors)
  y <- df[[dependent]]

  if (base::length(all_factors) == 0L) {
    return(list(
      headers = base::c("n", "平均値", "標準偏差"),
      rows = base::list(base::c(
        base::as.character(base::sum(!base::is.na(y))),
        FormatNum(base::mean(y, na.rm = TRUE)),
        FormatNum(stats::sd(y, na.rm = TRUE))
      ))
    ))
  }

  factor_cols <- base::lapply(all_factors, function(f) df[[f]])
  groups <- base::interaction(factor_cols, drop = TRUE, sep = " : ")

  cell_n <- base::tapply(y, groups, base::length)
  cell_mean <- base::tapply(y, groups, base::mean, na.rm = TRUE)
  cell_sd <- base::tapply(y, groups, stats::sd, na.rm = TRUE)

  names_vec <- base::names(cell_n)

  rows <- base::lapply(base::seq_along(names_vec), function(i) {
    base::c(
      names_vec[[i]],
      base::as.character(cell_n[[i]]),
      FormatNum(cell_mean[[i]]),
      FormatNum(cell_sd[[i]])
    )
  })

  list(headers = base::c("条件", "n", "平均値", "標準偏差"), rows = rows)
}

# ---- Formula Building ----

# Build ANOVA formula string supporting between, within, and mixed designs.
#
# Between-subjects only:  Y ~ A * B
# Within-subjects only:   Y ~ A * B + Error(Subject/(A*B))
# Mixed designs:          Y ~ A * B + Error(Subject/B)  (A=between, B=within)
#
.BuildAnovaFormula <- function(dependent, between_factors, within_factors,
                               subject, covariates, interactions) {
  dep_term <- .QuoteTerm(dependent)
  all_factors <- base::c(between_factors, within_factors)
  factor_terms <- base::vapply(all_factors, .QuoteTerm, base::character(1))
  cov_terms <- if (base::length(covariates) > 0L) {
    base::vapply(covariates, .QuoteTerm, base::character(1))
  } else {
    base::character(0)
  }

  if (base::identical(interactions, "all")) {
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
    # Manual interaction terms
    all_terms <- base::c(factor_terms, cov_terms)
    rhs <- base::paste(all_terms, collapse = " + ")

    if (base::is.list(interactions) && base::length(interactions) > 0L) {
      interaction_strs <- base::vapply(interactions, function(term) {
        base::paste(base::vapply(term, .QuoteTerm, base::character(1)), collapse = ":")
      }, base::character(1))
      rhs <- base::paste(rhs, "+", base::paste(interaction_strs, collapse = " + "))
    }
  }

  # Add Error() term for within-subjects factors
  if (base::length(within_factors) > 0L) {
    subj_term <- .QuoteTerm(subject)
    within_terms <- base::vapply(within_factors, .QuoteTerm, base::character(1))
    within_rhs <- base::paste(within_terms, collapse = " * ")
    formula_str <- base::paste0(dep_term, " ~ ", rhs,
                                " + Error(", subj_term, "/(", within_rhs, "))")
  } else {
    formula_str <- base::paste(dep_term, "~", rhs)
  }

  formula_str
}

# ---- Effect Size Calculation ----

# Compute effect size from ANOVA summary values.
#
# Args:
#   ss_effect  - Sum of Squares for the effect
#   df_effect  - Degrees of freedom for the effect
#   ss_error   - Sum of Squares for the error term (stratum residuals)
#   ms_error   - Mean Square for the error term
#   ss_total   - Total Sum of Squares across all strata
#   type       - "peta" (partial eta^2), "eta" (eta^2), "omega" (omega^2), "none"
#
.CalcEffectSize <- function(ss_effect, df_effect, ss_error, ms_error, ss_total, type) {
  if (base::identical(type, "none")) return(NA_character_)

  val <- if (base::identical(type, "peta")) {
    # Partial eta squared: SS_effect / (SS_effect + SS_error)
    ss_effect / (ss_effect + ss_error)
  } else if (base::identical(type, "eta")) {
    # Eta squared: SS_effect / SS_total
    ss_effect / ss_total
  } else if (base::identical(type, "omega")) {
    # Omega squared: (SS_effect - df_effect * MS_error) / (SS_total + MS_error)
    (ss_effect - df_effect * ms_error) / (ss_total + ms_error)
  } else {
    NA_real_
  }

  if (base::is.na(val) || !base::is.finite(val)) return(NA_character_)
  FormatNum(val)
}

# ---- ANOVA Result Parsing ----

# Check if a term (e.g. "A:B") involves only between-subjects factors.
.IsBetweenEffect <- function(term, between_factors) {
  parts <- base::strsplit(base::trimws(term), ":")[[1]]
  parts <- base::gsub("^`|`$", "", parts)
  base::all(parts %in% between_factors)
}

# Format F value with significance stars appended.
.FormatFCell <- function(f_value, p_value) {
  formatted <- FormatNum(f_value)
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

# Build a single output row for the ANOVA table.
.BuildAnovaRow <- function(term, ss, df_val, ms, f_val, p_val,
                           is_residual, ss_error, ms_error, ss_total,
                           effect_size, has_es_col) {
  row <- base::c(
    term,
    FormatNum(ss),
    base::as.character(base::as.integer(df_val)),
    FormatNum(ms),
    .FormatFCell(f_val, p_val),
    FormatPval(p_val)
  )

  if (has_es_col) {
    if (is_residual) {
      row <- base::c(row, NA_character_)
    } else {
      es_val <- .CalcEffectSize(ss, df_val, ss_error, ms_error, ss_total, effect_size)
      row <- base::c(row, es_val)
    }
  }

  row
}

# Parse aov() result into ANOVA table with effect sizes.
#
# Handles both simple (between-only, no Error) and repeated-measures
# (Error strata) models.
#
.ParseAovResult <- function(fit, within_factors, between_factors, effect_size) {
  has_error <- base::inherits(fit, "aovlist")
  smry <- base::summary(fit)

  # Determine effect size header label
  es_label <- base::switch(effect_size,
    peta = "偏η²",
    eta = "η²",
    omega = "ω²",
    none = NULL,
    "偏η²"
  )
  has_es_col <- !is.null(es_label)

  headers <- base::c("要因", "平方和", "自由度", "平均平方", "F値", "p値")
  if (has_es_col) headers <- base::c(headers, es_label)

  if (!has_error) {
    # --- Between-subjects only: single summary table ---
    tbl <- smry[[1]]
    term_names <- base::trimws(base::rownames(tbl))
    ss_total <- base::sum(tbl[, "Sum Sq"], na.rm = TRUE)

    res_idx <- base::which(term_names == "Residuals")
    ss_error <- if (base::length(res_idx) > 0L) tbl[res_idx, "Sum Sq"] else 0
    ms_error <- if (base::length(res_idx) > 0L) tbl[res_idx, "Mean Sq"] else 0

    rows <- base::lapply(base::seq_len(base::nrow(tbl)), function(i) {
      .BuildAnovaRow(
        term_names[[i]], tbl[i, "Sum Sq"], tbl[i, "Df"], tbl[i, "Mean Sq"],
        tbl[i, "F value"], tbl[i, "Pr(>F)"],
        term_names[[i]] == "Residuals", ss_error, ms_error, ss_total,
        effect_size, has_es_col
      )
    })

    has_within <- FALSE
  } else {
    # --- Repeated measures / Mixed: merge Error strata ---
    strata_names <- base::names(smry)

    # First pass: compute SS_total and count strata metadata
    ss_total <- 0
    n_effect_strata <- 0L
    has_between_stratum <- FALSE

    for (sn in strata_names) {
      st <- smry[[sn]]
      if (is.null(st) || base::length(st) == 0L) next
      tbl <- st[[1]]
      if (is.null(tbl)) next
      ss_total <- ss_total + base::sum(tbl[, "Sum Sq"], na.rm = TRUE)

      terms <- base::trimws(base::rownames(tbl))
      non_res <- terms[terms != "Residuals"]
      if (base::length(non_res) > 0L) {
        n_effect_strata <- n_effect_strata + 1L
        all_between <- base::all(base::vapply(non_res, function(t) {
          .IsBetweenEffect(t, between_factors)
        }, base::logical(1)))
        if (all_between && base::length(between_factors) > 0L) {
          has_between_stratum <- TRUE
        }
      }
    }

    n_within_effect_strata <- n_effect_strata - if (has_between_stratum) 1L else 0L

    # Second pass: build rows
    rows <- base::list()

    for (sn in strata_names) {
      st <- smry[[sn]]
      if (is.null(st) || base::length(st) == 0L) next
      tbl <- st[[1]]
      if (is.null(tbl)) next

      terms <- base::trimws(base::rownames(tbl))
      non_res <- terms[terms != "Residuals"]
      res_idx <- base::which(terms == "Residuals")

      # Skip strata with only Residuals and no effects (pure subject stratum)
      if (base::length(non_res) == 0L) next

      # Error term for this stratum
      local_ss_error <- if (base::length(res_idx) > 0L) tbl[res_idx, "Sum Sq"] else 0
      local_ms_error <- if (base::length(res_idx) > 0L) tbl[res_idx, "Mean Sq"] else 0

      # Determine if this is a between-subjects stratum
      is_between_stratum <- base::all(base::vapply(non_res, function(t) {
        .IsBetweenEffect(t, between_factors)
      }, base::logical(1))) && base::length(between_factors) > 0L

      for (i in base::seq_len(base::nrow(tbl))) {
        term <- terms[[i]]
        is_res <- (term == "Residuals")

        # Compute residual label
        display_term <- term
        if (is_res && n_effect_strata > 1L) {
          if (is_between_stratum) {
            display_term <- "Residuals (被験者間)"
          } else if (n_within_effect_strata == 1L) {
            display_term <- "Residuals (被験者内)"
          } else {
            display_term <- base::paste0("Residuals (", base::paste(non_res, collapse = ", "), ")")
          }
        }

        rows <- base::c(rows, base::list(.BuildAnovaRow(
          display_term, tbl[i, "Sum Sq"], tbl[i, "Df"], tbl[i, "Mean Sq"],
          tbl[i, "F value"], tbl[i, "Pr(>F)"],
          is_res, local_ss_error, local_ms_error, ss_total,
          effect_size, has_es_col
        )))
      }
    }

    has_within <- TRUE
  }

  # Build note
  note_parts <- "***p < .001, **p < .01, *p < .05"
  if (has_within) {
    note_parts <- base::c(note_parts,
      "注: 被験者内効果は球面性の仮定に基づく。必要に応じてGreenhouse-Geisser補正を考慮してください。")
  }
  note <- base::paste(note_parts, collapse = "\n")

  list(headers = headers, rows = rows, note = note)
}

# ---- Balance Check ----

# Check if the design is balanced (equal cell sizes).
.IsBalancedDesign <- function(df, between_factors, within_factors) {
  all_factors <- base::c(between_factors, within_factors)
  if (base::length(all_factors) == 0L) return(TRUE)

  factor_cols <- base::lapply(all_factors, function(f) df[[f]])
  groups <- base::interaction(factor_cols, drop = TRUE)
  cell_counts <- base::as.integer(base::table(groups))
  base::length(base::unique(cell_counts)) == 1L
}

# ---- Pairwise Comparisons ----

# Run pairwise comparisons with Holm correction for significant main effects
# with 3+ levels.
#
# Returns NULL if no qualifying effects exist.
#
.RunPairwiseComparisons <- function(df, dependent, subject,
                                    between_factors, within_factors, fit) {
  smry <- base::summary(fit)
  has_error <- base::inherits(fit, "aovlist")

  # Collect p-values for all effects
  effect_pvals <- list()
  if (!has_error) {
    tbl <- smry[[1]]
    terms <- base::trimws(base::rownames(tbl))
    for (i in base::seq_len(base::nrow(tbl))) {
      t_name <- terms[[i]]
      if (t_name != "Residuals") {
        p <- tbl[i, "Pr(>F)"]
        if (!base::is.na(p)) effect_pvals[[t_name]] <- p
      }
    }
  } else {
    for (sn in base::names(smry)) {
      st <- smry[[sn]]
      if (is.null(st) || base::length(st) == 0L) next
      tbl <- st[[1]]
      if (is.null(tbl)) next
      terms <- base::trimws(base::rownames(tbl))
      for (i in base::seq_len(base::nrow(tbl))) {
        t_name <- terms[[i]]
        if (t_name != "Residuals") {
          p <- tbl[i, "Pr(>F)"]
          if (!base::is.na(p)) effect_pvals[[t_name]] <- p
        }
      }
    }
  }

  # Find qualifying main effects: single factor, p < .05, 3+ levels
  all_factors <- base::c(between_factors, within_factors)
  qualifying <- base::character(0)

  for (factor_name in all_factors) {
    p <- effect_pvals[[factor_name]]
    if (is.null(p) || base::is.na(p)) next
    if (p >= 0.05) next
    n_levels <- base::nlevels(df[[factor_name]])
    if (n_levels < 3L) next
    qualifying <- base::c(qualifying, factor_name)
  }

  if (base::length(qualifying) == 0L) return(NULL)

  # Run pairwise comparisons for each qualifying factor
  all_rows <- base::list()

  for (factor_name in qualifying) {
    is_within <- factor_name %in% within_factors

    pw <- tryCatch({
      if (is_within && !is.null(subject) && base::nzchar(subject)) {
        ordered_df <- df[base::order(df[[factor_name]], df[[subject]]), ]
        stats::pairwise.t.test(
          ordered_df[[dependent]], ordered_df[[factor_name]],
          paired = TRUE, p.adjust.method = "holm"
        )
      } else {
        stats::pairwise.t.test(
          df[[dependent]], df[[factor_name]],
          p.adjust.method = "holm"
        )
      }
    }, error = function(e) NULL)

    if (is.null(pw)) next

    # Compute group means for mean differences
    group_means <- base::tapply(df[[dependent]], df[[factor_name]],
                                base::mean, na.rm = TRUE)

    # Extract pairwise results from p-value matrix
    p_mat <- pw$p.value
    row_names <- base::rownames(p_mat)
    col_names <- base::colnames(p_mat)

    for (r in base::seq_len(base::nrow(p_mat))) {
      for (cc in base::seq_len(base::ncol(p_mat))) {
        p_val <- p_mat[r, cc]
        if (base::is.na(p_val)) next

        grp1 <- col_names[[cc]]
        grp2 <- row_names[[r]]

        mean_diff <- group_means[[grp1]] - group_means[[grp2]]

        comp_label <- base::paste0(factor_name, ": ", grp1, " - ", grp2)

        p_formatted <- FormatPval(p_val)
        p_stars <- StarsForPval(p_val)
        if (base::nzchar(p_stars)) {
          p_formatted <- base::paste0(p_formatted, p_stars)
        }
        all_rows <- base::c(all_rows, base::list(base::c(
          comp_label,
          FormatNum(mean_diff),
          p_formatted
        )))
      }
    }
  }

  if (base::length(all_rows) == 0L) return(NULL)

  note <- "Holm法による調整"
  if (base::any(qualifying %in% within_factors)) {
    note <- base::paste0(note, "（被験者内要因は対応ありt検定を使用）")
  }

  list(
    headers = base::c("比較", "平均差", "調整済みp値"),
    rows = all_rows,
    note = note
  )
}

# ---- Wide-to-Long Reshape ----

# Transform wide-format within-subjects data into long format.
#
# Args:
#   df                   - data.frame in wide format
#   subject              - subject ID column name
#   between_factors      - character vector of between-subjects factor column names
#   within_factor_name   - name for the new within-subjects factor column
#   within_factor_levels - character vector of column names representing levels
#   covariates           - character vector of covariate column names
#
# Returns:
#   list(df, dependent, within_factors)
#
.ReshapeWideLong <- function(df, subject, between_factors,
                              within_factor_name, within_factor_levels,
                              covariates) {
  missing <- within_factor_levels[!within_factor_levels %in% base::colnames(df)]
  if (base::length(missing) > 0L) {
    StopWithErrCode("ERR-920")
  }

  id_cols <- base::c(subject, between_factors, covariates)
  id_cols <- id_cols[base::nzchar(id_cols)]

  n_rows <- base::nrow(df)

  long_parts <- base::lapply(within_factor_levels, function(level_col) {
    part <- df[, id_cols, drop = FALSE]
    part[[within_factor_name]] <- base::rep(level_col, n_rows)
    part[["value"]] <- df[[level_col]]
    part
  })

  long_df <- base::do.call(base::rbind, long_parts)
  base::rownames(long_df) <- NULL

  list(df = long_df, dependent = "value", within_factors = base::c(within_factor_name))
}

# ---- Main Entry Point ----

# Run ANOVA analysis with support for between, within, and mixed designs.
#
# For within-subjects designs, data is expected in wide format.
# Columns specified by within_factor_levels are reshaped into long format
# with a single factor column named within_factor_name.
#
# Args:
#   df                   - data.frame
#   dependent            - dependent variable column name (not required when
#                          within_factor_levels is provided; derived from reshape)
#   subject              - subject ID column name (required when within factors present)
#   between_factors      - character vector of between-subjects factor column names
#   within_factor_name   - name for the within-subjects factor (e.g. "time")
#   within_factor_levels - character vector of column names representing within levels
#   covariates           - character vector of covariate column names
#   interactions         - "all" or list of interaction term vectors
#   effect_size          - "peta" | "eta" | "omega" | "none"
#
# Returns:
#   list(descriptive, anova_table, comparisons)
#
RunAnova <- function(df, dependent = NULL, subject = NULL,
                     between_factors = NULL,
                     within_factor_name = NULL, within_factor_levels = NULL,
                     covariates = NULL, interactions = "all",
                     effect_size = "peta") {
  IsDataFrame(df)

  # --- Normalize vectors ---
  between_factors <- if (is.null(between_factors) || base::length(between_factors) == 0L) {
    base::character(0)
  } else {
    base::as.character(between_factors)
  }
  within_factor_levels <- if (is.null(within_factor_levels) || base::length(within_factor_levels) == 0L) {
    base::character(0)
  } else {
    base::as.character(within_factor_levels)
  }
  covariates <- if (is.null(covariates) || base::length(covariates) == 0L) {
    base::character(0)
  } else {
    base::as.character(covariates)
  }

  # --- Wide-to-long transformation for within-subjects ---
  if (base::length(within_factor_levels) > 0L) {
    if (is.null(within_factor_name) || !base::nzchar(within_factor_name)) {
      base::stop("被験者内要因名が指定されていません")
    }
    if (is.null(subject) || !base::nzchar(subject)) {
      StopWithErrCode("ERR-920")
    }
    reshaped <- .ReshapeWideLong(df, subject, between_factors,
                                  within_factor_name, within_factor_levels,
                                  covariates)
    df <- reshaped$df
    dependent <- reshaped$dependent
    within_factors <- reshaped$within_factors
  } else {
    within_factors <- base::character(0)
    if (is.null(dependent) || !base::nzchar(dependent)) {
      base::stop("従属変数が指定されていません")
    }
  }

  if (base::length(between_factors) == 0L && base::length(within_factors) == 0L) {
    StopWithErrCode("ERR-920")
  }

  if (base::length(within_factors) > 0L) {
    if (is.null(subject) || !base::nzchar(subject)) {
      StopWithErrCode("ERR-920")
    }
    if (!subject %in% base::colnames(df)) {
      StopWithErrCode("ERR-920")
    }
  }

  # Column existence check
  all_cols <- base::c(dependent, between_factors, within_factors, covariates)
  if (!is.null(subject) && base::nzchar(subject)) {
    all_cols <- base::c(all_cols, subject)
  }
  missing_cols <- all_cols[!all_cols %in% base::colnames(df)]
  if (base::length(missing_cols) > 0L) {
    StopWithErrCode("ERR-920")
  }

  # No overlap between between_factors and within_factors
  if (base::length(base::intersect(between_factors, within_factors)) > 0L) {
    StopWithErrCode("ERR-920")
  }

  # Normalize interaction terms
  inter_norm <- .NormalizeInteractions(interactions)
  all_factors <- base::c(between_factors, within_factors)
  if (base::is.list(inter_norm) && base::length(inter_norm) > 0L) {
    all_inter_vars <- base::unlist(inter_norm)
    if (base::any(!all_inter_vars %in% all_factors)) {
      StopWithErrCode("ERR-920")
    }
  }

  # Normalize effect_size
  effect_size <- base::as.character(effect_size)
  if (!effect_size %in% base::c("peta", "eta", "omega", "none")) {
    effect_size <- "peta"
  }

  # --- Type conversions ---
  df[[dependent]] <- .NormalizeAnovaNumericColumn(df[[dependent]], dependent, "従属変数")

  for (col in all_factors) {
    df[[col]] <- base::as.factor(df[[col]])
  }

  if (!is.null(subject) && base::nzchar(subject)) {
    df[[subject]] <- base::as.factor(df[[subject]])
  }

  for (col in covariates) {
    df[[col]] <- .NormalizeAnovaNumericColumn(df[[col]], col, "共変量")
  }

  # --- 1. Descriptive statistics ---
  desc <- .DescriptiveByCell(df, dependent, between_factors, within_factors)

  # --- 2. Run ANOVA ---
  formula_str <- .BuildAnovaFormula(dependent, between_factors, within_factors,
                                     subject, covariates, inter_norm)
  fit <- stats::aov(stats::as.formula(formula_str), data = df)

  # --- 3. Parse ANOVA table with effect sizes ---
  anova_tbl <- .ParseAovResult(fit, within_factors, between_factors, effect_size)

  # --- 4. Balance check ---
  if (!.IsBalancedDesign(df, between_factors, within_factors)) {
    existing_note <- anova_tbl$note
    balance_note <- "注: セル間のデータ数が等しくありません。Type I 平方和が使用されています。"
    anova_tbl$note <- base::paste(existing_note, balance_note, sep = "\n")
  }

  # --- 5. Pairwise comparisons (conditional) ---
  comps <- .RunPairwiseComparisons(df, dependent, subject,
                                    between_factors, within_factors, fit)

  list(
    descriptive = desc,
    anova_table = anova_tbl,
    comparisons = comps
  )
}
