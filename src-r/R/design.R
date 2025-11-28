RunDesign <- function(x, options = NULL) {
  if (is.null(options) || !is.list(options)) {
    stop("options must be a non-null list for design analysis")
  }

  # 共通パラメータの単純な取り出しと検証
  test <- options$test
  if (is.null(test) || !base::nzchar(base::as.character(test))) {
    stop("test is missing")
  }
  test <- base::as.character(test)

  if (!base::exists("COHEN_ES")) {
    stop("COHEN_ES is not defined (constants.R not loaded)")
  }
  if (!test %in% base::names(COHEN_ES)) {
    stop(base::sprintf("Unknown test key for COHEN_ES: %s", test))
  }
  effect <- COHEN_ES[[test]]

  s <- options$sig_level
  if (is.null(s)) stop("sig_level is missing")
  sig_level <- base::as.numeric(s)
  if (!base::is.finite(sig_level) || sig_level <= 0 || sig_level >= 1) {
    stop("sig_level must be between 0 and 1")
  }

  p <- options$power
  if (is.null(p)) stop("power is missing")
  power <- base::as.numeric(p)
  if (!base::is.finite(power) || power <= 0 || power >= 1) {
    stop("power must be between 0 and 1")
  }

  # 表示用に事前フォーマット
  effect_str <- FormatNum(effect)
  alpha_str <- FormatNum(sig_level)
  power_str <- FormatNum(power)

  headers <- c("Required N", "Effect size", "Alpha", "Power", "Additional")

  # Branch per test
  if (base::identical(test, "t")) {
    tt <- options$t_type
    if (is.null(tt) || !base::nzchar(base::as.character(tt))) {
      t_type <- "two.sample"
    } else {
      t_type <- base::as.character(tt)
    }

    if (!t_type %in% c("one.sample", "two.sample", "paired")) {
      stop("t_type must be one of 'one.sample', 'two.sample', 'paired'")
    }

    a <- options$alternative
    if (is.null(a) || !base::nzchar(base::as.character(a))) {
      alt_opt <- "two.sided"
    } else {
      alt_opt <- base::as.character(a)
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
      # 日本語はフロント側で扱うため、ここでは ASCII のみを返す
      add_text <- base::sprintf("ERROR:t-test:%s", base::conditionMessage(res))
    } else {
      n_raw <- res$n
      n_val <- FormatDf(n_raw)
      # 正常系では追加パラメータはフロント側で組み立てるので空にしておく
      add_text <- ""
    }

    row <- c(n_val, effect_str, alpha_str, power_str, add_text)
    return(list(headers = headers, rows = list(row)))
  }

  if (base::identical(test, "anov")) {
    kv <- options$k
    if (is.null(kv)) stop("k is missing for anova")
    k <- base::as.numeric(kv)
    if (!base::is.finite(k) || k < 2) {
      stop("k must be >= 2")
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
    # 追加パラメータはフロント側で表示用に組み立てる
    add_text <- ""

    row <- c(n_val, effect_str, alpha_str, power_str, add_text)
    return(list(headers = headers, rows = list(row)))
  }

  if (base::identical(test, "chisq")) {
    cv <- options$categories
    if (is.null(cv)) stop("categories is missing for chisq")
    categories <- base::as.numeric(cv)
    if (!base::is.finite(categories) || categories < 2) {
      stop("categories must be >= 2")
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
    # 追加パラメータはフロント側で表示用に組み立てる
    add_text <- ""

    row <- c(n_val, effect_str, alpha_str, power_str, add_text)
    return(list(headers = headers, rows = list(row)))
  }

  if (base::identical(test, "f2")) {
    uv <- options$u
    if (is.null(uv)) stop("u is missing for f2")
    u <- base::as.numeric(uv)
    if (!base::is.finite(u) || u < 1) {
      stop("u must be >= 1")
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
    # 追加パラメータはフロント側で表示用に組み立てる
    add_text <- ""

    row <- c(n_val, effect_str, alpha_str, power_str, add_text)
    return(list(headers = headers, rows = list(row)))
  }

  stop(base::sprintf("Unsupported design test: %s", test))
}
