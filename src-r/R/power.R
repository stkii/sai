# ==================
# Power analysis
# ==================

# Cohen's (conventional) effect size thresholds for "small" effect across different statistical tests
COHEN_ES_SMALL <- c(
  "anov" = 0.1,     # One-way ANOVA
  "chisq" = 0.1,     # Chi-squared test
  "f2" = 0.02,       # General linear model
  "p" = 0.1,         # One-sample proportion test
  "r" = 0.1,         # Pearson correlation
  "t" = 0.2          # t-test
)

COHEN_ES_MEDIUM <- c(
  "anov" = 0.25,     # One-way ANOVA
  "chisq" = 0.3,     # Chi-squared test
  "f2" = 0.15,       # General linear model
  "p" = 0.3,         # One-sample proportion test
  "r" = 0.3,         # Pearson correlation
  "t" = 0.5          # t-test
)

COHEN_ES_LARGE <- c(
  "anov" = 0.4,     # One-way ANOVA
  "chisq" = 0.5,     # Chi-squared test
  "f2" = 0.35,       # General linear model
  "p" = 0.5,         # One-sample proportion test
  "r" = 0.5,         # Pearson correlation
  "t" = 0.8          # t-test
)
.PowerTest <- function(effect = NULL,
                       test = NULL,
                       sig_level = NULL,
                       power = 0.8,
                       t_type = NULL,
                       alternative = NULL,
                       k = NULL,
                       categories = NULL,
                       df = NULL,
                       u = NULL) {
  if (!requireNamespace("pwr", quietly = TRUE)) {
    StopWithErrCode("ERR-926")
  }

  test <- base::as.character(test)
  if (is.null(test) || !base::nzchar(test)) {
    StopWithErrCode("ERR-920")
  }
  test <- base::tolower(test)
  if (!test %in% c("anov", "chisq", "f2", "r", "t", "p")) {
    StopWithErrCode("ERR-920")
  }

  if (effect == "small") {
    effect <- COHEN_ES_SMALL[[test]]
  } else if (effect == "medium") {
    effect <- COHEN_ES_MEDIUM[[test]]
  } else if (effect == "large") {
    effect <- COHEN_ES_LARGE[[test]]
  } else {
    StopWithErrCode("ERR-850")
  }

  if (is.null(effect) || !base::is.numeric(effect) || !base::is.finite(effect)) {
    StopWithErrCode("ERR-920")
  }

  if (is.null(sig_level) || !base::is.numeric(sig_level)) {
    StopWithErrCode("ERR-845")
  }
  sig_level <- base::as.numeric(sig_level[[1]])
  if (!base::is.finite(sig_level) || sig_level <= 0 || sig_level >= 1) {
    StopWithErrCode("ERR-845")
  }

  if (is.null(power) || !base::is.numeric(power)) {
    StopWithErrCode("ERR-846")
  }
  power <- base::as.numeric(power[[1]])
  if (!base::is.finite(power) || power <= 0 || power >= 1) {
    StopWithErrCode("ERR-846")
  }

  alternative_norm <- NULL
  if (test %in% c("r", "t", "p")) {
    alternative_norm <- .ValidateOptionInSet(alternative, c("two.sided", "less", "greater"))
  }

  t_type_norm <- NULL
  if (test == "t") {
    t_type_norm <- .ValidateOptionInSet(t_type, c("one.sample"))
  }

  k_val <- NULL
  if (test == "anov") {
    if (is.null(k) || !base::is.numeric(k)) {
      StopWithErrCode("ERR-847")
    }
    k_val <- base::as.integer(k[[1]])
    if (base::is.na(k_val) || k_val < 2L || !base::isTRUE(base::all.equal(k[[1]], k_val))) {
      StopWithErrCode("ERR-847")
    }
  }

  df_val <- NULL
  if (test == "chisq") {
    if (is.null(df) || !base::is.numeric(df)) {
      StopWithErrCode("ERR-851")
    }
    df_val <- base::as.integer(df[[1]])
    if (base::is.na(df_val) || df_val < 1L || !base::isTRUE(base::all.equal(df[[1]], df_val))) {
      StopWithErrCode("ERR-851")
    }
  }

  u_val <- NULL
  if (test == "f2") {
    if (is.null(u) || !base::is.numeric(u)) {
      StopWithErrCode("ERR-849")
    }
    u_val <- base::as.integer(u[[1]])
    if (base::is.na(u_val) || u_val < 1L || !base::isTRUE(base::all.equal(u[[1]], u_val))) {
      StopWithErrCode("ERR-849")
    }
  }

  res <- switch(
    test,
    anov = pwr::pwr.anova.test(k = k_val, n = NULL, f = effect, sig.level = sig_level, power = power),
    chisq = pwr::pwr.chisq.test(w = effect, N = NULL, df = df_val, sig.level = sig_level, power = power),
    f2 = pwr::pwr.f2.test(u = u_val, v = NULL, f2 = effect, sig.level = sig_level, power = power),
    r = pwr::pwr.r.test(n = NULL, r = effect, sig.level = sig_level, power = power, alternative = alternative_norm),
    t = pwr::pwr.t.test(n = NULL, d = effect, sig.level = sig_level, power = power, type = t_type_norm, alternative = alternative_norm),
    p = pwr::pwr.p.test(n = NULL, h = effect, sig.level = sig_level, power = power, alternative = alternative_norm)
  )

  n_value <- switch(
    test,
    anov = res$n,
    chisq = res$N,
    f2 = u_val + res$v + 1,
    r = res$n,
    t = res$n,
    p = res$n
  )

  headers <- c("サンプルサイズ N", "効果量", "有意水準", "検出力")
  row <- base::c(
    FormatNum(n_value),
    FormatNum(effect),
    FormatNum(sig_level),
    FormatNum(power)
  )

  result <- list(headers = headers, rows = list(row))
  title <- switch(
    test,
    anov = "一元配置分散分析",
    chisq = "カイ2乗検定",
    f2 = "回帰分析",
    r = "相関",
    t = "t検定",
    p = "比率"
  )
  result$title <- sprintf("サンプルサイズ（%s）", title)

  result
}

RunPowerTest <- function(effect = NULL,
                         test = NULL,
                         sig_level = NULL,
                         power = 0.8,
                         t_type = NULL,
                         alternative = NULL,
                         k = NULL,
                         categories = NULL,
                         df = NULL,
                         u = NULL) {
  .PowerTest(
    effect = effect,
    test = test,
    sig_level = sig_level,
    power = power,
    t_type = t_type,
    alternative = alternative,
    k = k,
    categories = categories,
    df = df,
    u = u
  )
}
