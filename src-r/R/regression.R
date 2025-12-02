# Linear regression core
#
# Args:
# - data (data.frame): dataset that contains columns referenced by variables
# - dependent (character len=1): dependent variable name
# - independents (character): independent variable names (len>=1)
# - intercept (logical): include intercept term (default TRUE)
# - weights (numeric or NULL): optional weights vector (same length as nrow(data))
# - na_action (character): 'na.omit' | 'na.exclude' | 'na.fail'
# - center (logical): whether to mean-center independent variables before fitting
#
# Returns:
# - stats::lm object
.LinearRegression <- function(data,
                             dependent,
                             independents,
                             intercept = TRUE,
                             weights = NULL,
                             na_action = "na.omit",
                             center = FALSE) {
  if (is.null(data)) stop("data is NULL")
  if (!is.data.frame(data)) data <- base::as.data.frame(data)

  dep <- base::as.character(dependent)
  indep <- base::as.character(independents)

  if (length(dep) != 1L || !nzchar(dep)) stop("'dependent' must be a single variable name")
  if (length(indep) < 1L || any(!nzchar(indep))) stop("'independents' must contain at least one variable name")

  # Column existence check
  vars <- base::colnames(data)
  if (is.null(vars)) stop("data has no column names")
  missing_cols <- base::setdiff(c(dep, indep), vars)
  if (length(missing_cols) > 0L) {
    stop(base::sprintf("Columns not found in data: %s", base::paste(missing_cols, collapse = ", ")))
  }

  # Optionally center independent variables (and interaction terms) only
  if (isTRUE(center)) {
    center_cols <- base::intersect(indep, vars)
    if (base::length(center_cols) > 0L && exists("CenterVariables") && is.function(get("CenterVariables"))) {
      data <- CenterVariables(data, columns = center_cols, na_rm = TRUE)
    }
  }

  rhs <- base::paste(indep, collapse = " + ")
  if (!isTRUE(intercept)) {
    # Remove intercept via '0 +' (same as '-1')
    rhs <- base::paste("0 +", rhs)
  }
  fml <- stats::as.formula(base::paste(dep, "~", rhs))

  na_fun <- switch(base::as.character(na_action),
                   "na.exclude" = stats::na.exclude,
                   "na.fail"    = stats::na.fail,
                   stats::na.omit)

  fit <- stats::lm(formula = fml,
                   data = data,
                   weights = weights,
                   na.action = na_fun,
                   model = TRUE,
                   x = FALSE,
                   y = FALSE)
  return(fit)
}

## Formatting helpers are provided by utils.R: FormatNum, FormatDf, FormatPval

# Calculate Variance Inflation Factors (VIF) per coefficient column
# - Uses model.matrix(fit) columns (excluding intercept)
# - For each column j, regress x_j on the remaining columns with intercept
#   and compute VIF_j = 1 / (1 - R^2_j)
# - Respects weights(fit) when present
.CalculateVIF <- function(fit) {
  mm <- base::tryCatch(stats::model.matrix(fit), error = function(e) NULL)
  if (is.null(mm)) return(stats::setNames(numeric(0), character(0)))
  cn <- base::colnames(mm)
  if (is.null(cn)) return(stats::setNames(numeric(0), character(0)))
  preds <- base::setdiff(cn, "(Intercept)")
  if (length(preds) == 0L) return(stats::setNames(numeric(0), character(0)))

  w <- base::tryCatch(stats::weights(fit), error = function(e) NULL)
  out <- base::rep(NA_real_, length(preds))
  base::names(out) <- preds

  for (j in preds) {
    yj <- base::as.numeric(mm[, j])
    others <- base::setdiff(preds, j)
    if (length(others) == 0L) {
      out[[j]] <- 1.0
      next
    }
    df <- base::data.frame(y = yj, mm[, others, drop = FALSE])
    sm <- base::tryCatch({
      s <- base::summary(stats::lm(y ~ ., data = df, weights = w))
      s
    }, error = function(e) NULL)
    if (is.null(sm) || is.null(sm$r.squared) || !is.finite(sm$r.squared)) {
      out[[j]] <- NA_real_
    } else {
      r2 <- base::as.numeric(sm$r.squared)
      if (!is.finite(r2)) {
        out[[j]] <- NA_real_
      } else if (r2 >= 1) {
        out[[j]] <- Inf
      } else if (r2 <= 0) {
        out[[j]] <- 1.0
      } else {
        out[[j]] <- 1 / (1 - r2)
      }
    }
  }
  out
}

# UI-friendly wrapper: returns a single ParsedTable composed of
# three blocks separated by labeled rows:
# - Model Summary (1-row summary)
# - Coefficients (Term/Estimate/Std. Error/t value/Pr(>|t|))
# - ANOVA (Regression/Residuals/Total)
.LinearRegressionParsed <- function(data,
                                   dependent,
                                   independents,
                                   intercept = TRUE,
                                   weights = NULL,
                                   na_action = "na.omit",
                                   center = FALSE) {
  fit <- .LinearRegression(data,
                          dependent = dependent,
                          independents = independents,
                          intercept = intercept,
                          weights = weights,
                          na_action = na_action,
                          center = center)

  sm <- base::summary(fit)

  # ---- Build model summary block ----
  n <- base::tryCatch(stats::nobs(fit), error = function(e) NA_real_)
  r2 <- base::tryCatch(sm$r.squared, error = function(e) NA_real_)
  adjr2 <- base::tryCatch(sm$adj.r.squared, error = function(e) NA_real_)
  sigma <- base::tryCatch(sm$sigma, error = function(e) NA_real_)
  df_resid <- base::tryCatch(stats::df.residual(fit), error = function(e) NA_real_)
  fstat <- base::tryCatch(sm$fstatistic, error = function(e) NULL)
  f_val <- if (!is.null(fstat)) base::unname(fstat[[1]]) else NA_real_
  df1 <- if (!is.null(fstat)) base::unname(fstat[[2]]) else NA_real_
  df2 <- if (!is.null(fstat)) base::unname(fstat[[3]]) else NA_real_
  p_f <- if (!is.na(f_val) && !is.na(df1) && !is.na(df2) && df1 > 0 && df2 > 0) stats::pf(f_val, df1, df2, lower.tail = FALSE) else NA_real_

  rows_summary <- list(
    c("--- Model Summary ---", "", "", "", "", "", ""),
    c("R-squared", "Adj. R-squared", "Residual Std. Error", "Residual DF", "F-statistic", "Pr(>F)", ""),
    c(
      FormatNum(r2),
      FormatNum(adjr2),
      FormatNum(sigma),
      FormatDf(df_resid),
      FormatNum(f_val),
      FormatPval(p_f),
      ""
    )
  )

  # ---- Build coefficients block ----
  coefs <- sm$coefficients
  coef_rows <- list()
  # Prepare standardized beta using model matrix columns aligned to coefficient names
  mf <- base::tryCatch(stats::model.frame(fit), error = function(e) NULL)
  mm <- base::tryCatch(stats::model.matrix(fit), error = function(e) NULL)
  y_vec <- if (!is.null(mf)) base::tryCatch(stats::model.response(mf), error = function(e) NULL) else NULL
  w_vec <- base::tryCatch(stats::weights(fit), error = function(e) NULL)

  w_sd <- function(v, w) {
    if (is.null(v)) return(NA_real_)
    v <- base::as.numeric(v)
    if (length(v) < 2L) return(NA_real_)
    if (is.null(w)) {
      return(stats::sd(v))
    } else {
      w <- base::as.numeric(w)
      if (length(w) != length(v)) return(NA_real_)
      s <- base::sum(w)
      if (!is.finite(s) || s <= 0) return(NA_real_)
      mu <- base::sum(w * v) / s
      var <- base::sum(w * (v - mu)^2) / s
      return(base::sqrt(var))
    }
  }

  sdy <- w_sd(y_vec, w_vec)

  # Precompute VIFs (numeric, no rounding here)
  vif_map <- .CalculateVIF(fit)

  if (!is.null(coefs) && base::nrow(coefs) > 0) {
    rn <- base::rownames(coefs)
    if (is.null(rn)) rn <- base::paste0("V", base::seq_len(base::nrow(coefs)))
    coef_rows <- base::lapply(base::seq_len(base::nrow(coefs)), function(i) {
      beta_val <- NA_real_
      nm <- rn[[i]]
      if (!base::identical(nm, "(Intercept)") && !is.null(mm) && !is.null(sdy) && is.finite(sdy) && sdy > 0) {
        if (!is.null(base::colnames(mm)) && nm %in% base::colnames(mm)) {
          xcol <- mm[, nm]
          sdx <- w_sd(xcol, w_vec)
          if (!is.na(sdx) && is.finite(sdx) && sdx > 0) {
            beta_val <- base::unname(coefs[i, 1]) * (sdx / sdy)
          }
        }
      }
      vif_val <- if (!base::identical(nm, "(Intercept)") && nm %in% base::names(vif_map)) base::unname(vif_map[[nm]]) else NA_real_
      c(
        rn[[i]],
        FormatNum(base::unname(coefs[i, 1])),
        FormatNum(beta_val),
        FormatNum(base::unname(coefs[i, 2])),
        FormatNum(base::unname(coefs[i, 3])),
        FormatPval(base::unname(coefs[i, 4])),
        FormatNum(vif_val)
      )
    })
  }
  rows_coef <- c(
    list(c("--- Coefficients ---", "", "", "", "", "", "")),
    list(c("Term", "Estimate", "Beta", "Std. Error", "t value", "Pr(>|t|)", "VIF")),
    coef_rows
  )

  # ---- Build ANOVA block ----
  # y, residuals, weights
  mf <- base::tryCatch(stats::model.frame(fit), error = function(e) NULL)
  y <- if (!is.null(mf)) base::tryCatch(stats::model.response(mf), error = function(e) NULL) else NULL
  res <- base::tryCatch(stats::residuals(fit), error = function(e) NULL)
  w <- base::tryCatch(stats::weights(fit), error = function(e) NULL)
  has_intercept <- base::tryCatch({
    trm <- stats::terms(fit)
    base::isTRUE(base::attr(trm, 'intercept') == 1)
  }, error = function(e) TRUE)

  # SSE (Sum of Squared Errors)
  sse <- NA_real_
  if (!is.null(res)) {
    if (is.null(w)) sse <- base::sum(res^2) else sse <- base::sum(w * res^2)
  }

  # SST (Total Sum of Squares)
  sst <- NA_real_
  if (!is.null(y)) {
    if (is.null(w)) {
      if (isTRUE(has_intercept)) {
        sst <- base::sum((y - base::mean(y))^2)
      } else {
        sst <- base::sum(y^2)
      }
    } else {
      if (isTRUE(has_intercept)) {
        mu <- stats::weighted.mean(y, w)
        sst <- base::sum(w * (y - mu)^2)
      } else {
        sst <- base::sum(w * y^2)
      }
    }
  }

  ssr <- if (!is.na(sst) && !is.na(sse)) sst - sse else NA_real_

  n_eff <- base::tryCatch(stats::nobs(fit), error = function(e) NA_real_)
  df_total <- if (!is.na(n_eff)) {
    if (isTRUE(has_intercept)) n_eff - 1 else n_eff
  } else NA_real_
  df_res <- df_resid
  df_reg <- if (!is.na(df_total) && !is.na(df_res)) base::max(df_total - df_res, 0) else NA_real_

  msr <- if (!is.na(df_reg) && df_reg > 0 && !is.na(ssr)) ssr / df_reg else NA_real_
  mse <- if (!is.na(df_res) && df_res > 0 && !is.na(sse)) sse / df_res else NA_real_
  f_anova <- if (!is.na(msr) && !is.na(mse) && mse > 0) msr / mse else NA_real_
  p_anova <- if (!is.na(f_anova) && !is.na(df_reg) && !is.na(df_res) && df_reg > 0 && df_res > 0) stats::pf(f_anova, df_reg, df_res, lower.tail = FALSE) else NA_real_

  rows_anova <- list(
    c("--- ANOVA ---", "", "", "", "", "", ""),
    c("Source", "Sum Sq", "Df", "Mean Sq", "F value", "Pr(>F)", ""),
    c("Regression", FormatNum(ssr), FormatDf(df_reg), FormatNum(msr), FormatNum(f_anova), FormatPval(p_anova), ""),
    c("Residuals", FormatNum(sse), FormatDf(df_res), FormatNum(mse), "", "", ""),
    c("Total", FormatNum(sst), FormatDf(df_total), "", "", "", "")
  )

  # ---- Combine into single table ----
  headers <- c("Section", "C1", "C2", "C3", "C4", "C5", "C6")
  rows <- c(rows_summary, rows_coef, rows_anova)
  return(list(headers = headers, rows = rows))
}

# High-level runner to align with CLI dispatch pattern
#
# options (list) expects:
# - dependent (character len=1)
# - independents (character)
# - intercept (logical, optional)
# - naAction (character, optional): 'na.omit' | 'na.exclude' | 'na.fail'
# - weights (numeric vector or NULL, optional)
# - center (logical, optional): whether to mean-center independent variables (and interactions)
RunRegression <- function(x, options = NULL) {
  if (is.null(options)) stop("options must include 'dependent' and 'independents'")

  dep <- base::tryCatch({
    d <- options$dependent
    if (is.null(d) || !nzchar(base::as.character(d))) stop("dependent is missing") else base::as.character(d)
  }, error = function(e) stop("Invalid 'dependent'"))

  indep <- base::tryCatch({
    iv <- options$independents
    if (is.null(iv)) character(0) else base::as.character(iv)
  }, error = function(e) character(0))
  if (length(indep) < 1L) stop("'independents' must contain at least one variable name")

  intercept <- base::tryCatch({
    ic <- options$intercept
    if (is.null(ic)) TRUE else base::isTRUE(ic)
  }, error = function(e) TRUE)

  na_action <- base::tryCatch({
    na <- options$naAction
    if (is.null(na) || !nzchar(base::as.character(na))) "na.omit" else base::as.character(na)
  }, error = function(e) "na.omit")

  weights <- base::tryCatch({
    w <- options$weights
    # Either NULL or numeric vector of length nrow(x)
    if (is.null(w)) NULL else base::as.numeric(w)
  }, error = function(e) NULL)

  center <- base::tryCatch({
    cflag <- options$center
    if (is.null(cflag)) FALSE else base::isTRUE(cflag)
  }, error = function(e) FALSE)

  # 交互作用項の自動生成
  # options$interactions は list / data.frame を想定し、
  # 各要素は left, right, label を含む。
  ints <- base::tryCatch(options$interactions, error = function(e) NULL)
  if (!is.null(ints)) {
    # data.frame の場合も list-of-list として扱えるように統一
    items <- if (base::is.data.frame(ints)) {
      split(ints, seq_len(nrow(ints)))
    } else if (base::is.list(ints)) {
      ints
    } else {
      list()
    }

    if (!base::is.data.frame(x)) {
      x <- base::as.data.frame(x, check.names = FALSE, stringsAsFactors = FALSE)
    }
    cols <- base::colnames(x)
    interaction_labels <- character(0)

    for (it in items) {
      if (is.null(it)) next
      left <- base::tryCatch(base::as.character(it$left), error = function(e) character(0))
      right <- base::tryCatch(base::as.character(it$right), error = function(e) character(0))
      lab <- base::tryCatch(it$label, error = function(e) NULL)
      if (length(left) < 1L || length(right) < 1L) next
      left <- left[[1L]]
      right <- right[[1L]]
      if (!nzchar(left) || !nzchar(right) || base::identical(left, right)) next
      if (!left %in% cols || !right %in% cols) {
        stop(base::sprintf("Interaction columns not found: %s, %s", left, right))
      }
      label_chr <- base::tryCatch({
        if (is.null(lab) || !nzchar(base::as.character(lab))) {
          base::paste0(left, "*", right)
        } else {
          base::as.character(lab)[[1L]]
        }
      }, error = function(e) base::paste0(left, "*", right))

      # 既に同名列が存在する場合は上書きせずスキップ
      if (label_chr %in% base::colnames(x)) next

      lx <- base::as.numeric(x[[left]])
      rx <- base::as.numeric(x[[right]])
      x[[label_chr]] <- lx * rx
      interaction_labels <- c(interaction_labels, label_chr)
    }

    if (length(interaction_labels) > 0L) {
      indep <- c(indep, interaction_labels)
    }
  }

  .LinearRegressionParsed(x,
                         dependent = dep,
                         independents = indep,
                         intercept = intercept,
                          weights = weights,
                         na_action = na_action,
                         center = center)
}
