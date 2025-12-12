RunDesign <- function(x,
                      test = NULL,
                      sig_level = NULL,
                      power = NULL,
                      t_type = NULL,
                      alternative = NULL,
                      k = NULL,
                      categories = NULL,
                      u = NULL) {
  # Extract and validate common parameters
  if (is.null(test) || !base::nzchar(base::as.character(test))) {
    StopWithErrCode("ERR-940")
  }
  test <- base::as.character(test)

  if (!base::exists("COHEN_ES")) {
    StopWithErrCode("ERR-940")
  }
  if (!test %in% base::names(COHEN_ES)) {
    StopWithErrCode("ERR-940")
  }
  effect <- COHEN_ES[[test]]

  if (is.null(sig_level)) StopWithErrCode("ERR-940")
  sig_level <- base::as.numeric(sig_level)
  if (!base::is.finite(sig_level) || sig_level <= 0 || sig_level >= 1) {
    StopWithErrCode("ERR-845")
  }

  if (is.null(power)) StopWithErrCode("ERR-940")
  power <- base::as.numeric(power)
  if (!base::is.finite(power) || power <= 0 || power >= 1) {
    StopWithErrCode("ERR-846")
  }

  # Pre-format for display
  effect_str <- FormatNum(effect)
  alpha_str <- FormatNum(sig_level)
  power_str <- FormatNum(power)

  headers <- c("Required N", "Effect size", "Alpha", "Power", "Additional")

  # Branch per test
  if (base::identical(test, "t")) {
    if (is.null(t_type) || !base::nzchar(base::as.character(t_type))) {
      t_type <- "two.sample"
    } else t_type <- base::as.character(t_type)

    if (!t_type %in% c("one.sample", "two.sample", "paired")) {
      StopWithErrCode("ERR-940")
    }

    if (is.null(alternative) || !base::nzchar(base::as.character(alternative))) {
      alt_opt <- "two.sided"
    } else {
      alt_opt <- base::as.character(alternative)
    }

    alt <- if (base::identical(alt_opt, "one.sided")) "greater" else alt_opt
    if (!alt %in% c("two.sided", "greater", "less")) {
      alt <- "two.sided"
    }

    res <- base::tryCatch({
      pwr::pwr.t.test(
        d = effect,
        n = NULL,
        sig.level = sig_level,
        power = power,
        type = t_type,
        alternative = alt
      )
    }, error = function(e) e)

    if (base::inherits(res, "error")) {
      n_val <- FormatDf(NA_real_)
      add_text <- base::sprintf("ERROR:t-test:%s", base::conditionMessage(res))
    } else {
      n_raw <- res$n
      n_val <- FormatDf(n_raw)
      add_text <- ""
    }

    row <- c(n_val, effect_str, alpha_str, power_str, add_text)
    return(list(headers = headers, rows = list(row)))
  }

  if (base::identical(test, "anov")) {
    if (is.null(k)) StopWithErrCode("ERR-940")
    k <- base::as.numeric(k)
    if (!base::is.finite(k) || k < 2) {
      StopWithErrCode("ERR-847")
    }

    res <- pwr::pwr.anova.test(
      k = k,
      n = NULL,
      f = effect,
      sig.level = sig_level,
      power = power
    )
    n_per <- res$n
    n_total <- k * n_per
    n_val <- FormatDf(n_total)
    # Additional parameters are assembled on the frontend for display
    add_text <- ""

    row <- c(n_val, effect_str, alpha_str, power_str, add_text)
    return(list(headers = headers, rows = list(row)))
  }

  if (base::identical(test, "chisq")) {
    if (is.null(categories)) StopWithErrCode("ERR-940")
    categories <- base::as.numeric(categories)
    if (!base::is.finite(categories) || categories < 2) {
      StopWithErrCode("ERR-848")
    }

    df <- categories - 1
    res <- pwr::pwr.chisq.test(
      w = effect,
      N = NULL,
      df = df,
      sig.level = sig_level,
      power = power
    )
    n_total <- res$N
    n_val <- FormatDf(n_total)
    # Additional parameters are assembled on the frontend for display
    add_text <- ""

    row <- c(n_val, effect_str, alpha_str, power_str, add_text)
    return(list(headers = headers, rows = list(row)))
  }

  if (base::identical(test, "f2")) {
    if (is.null(u)) StopWithErrCode("ERR-940")
    u <- base::as.numeric(u)
    if (!base::is.finite(u) || u < 1) {
      StopWithErrCode("ERR-849")
    }

    res <- pwr::pwr.f2.test(
      u = u,
      v = NULL,
      f2 = effect,
      sig.level = sig_level,
      power = power
    )
    v_df <- res$v
    # n = v + u + 1 (v = n - u - 1)
    n_total <- v_df + res$u + 1
    n_val <- FormatDf(n_total)
    # Additional parameters are assembled on the frontend for display
    add_text <- ""

    row <- c(n_val, effect_str, alpha_str, power_str, add_text)
    return(list(headers = headers, rows = list(row)))
  }

  StopWithErrCode("ERR-940")
}
