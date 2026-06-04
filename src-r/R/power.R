.PowerTTest <- function(opts) {
  power.t.test(
    n = if (is.null(opts$n)) NULL else opts$n,
    delta = if (is.null(opts$effect_size)) NULL else opts$effect_size,
    sd = if (is.null(opts$sd)) 1 else opts$sd,
    sig.level = if (is.null(opts$sig_level)) 0.05 else opts$sig_level,
    power = if (is.null(opts$power)) NULL else opts$power,
    type = if (is.null(opts$ttest_type)) "two.sample" else opts$ttest_type,
    alternative = if (is.null(opts$alternative)) "two.sided" else opts$alternative
  )
}

.PowerAnova <- function(opts) {
  power.anova.test(
    groups = if (is.null(opts$groups)) NULL else opts$groups,
    n = if (is.null(opts$n)) NULL else opts$n,
    between.var = if (is.null(opts$between_var)) NULL else opts$between_var,
    within.var = if (is.null(opts$within_var)) NULL else opts$within_var,
    sig.level = if (is.null(opts$sig_level)) 0.05 else opts$sig_level,
    power = if (is.null(opts$power)) NULL else opts$power
  )
}

.PowerProp <- function(opts) {
  power.prop.test(
    n = if (is.null(opts$n)) NULL else opts$n,
    p1 = if (is.null(opts$p1)) NULL else opts$p1,
    p2 = if (is.null(opts$p2)) NULL else opts$p2,
    sig.level = if (is.null(opts$sig_level)) 0.05 else opts$sig_level,
    power = if (is.null(opts$power)) NULL else opts$power
  )
}

.PowerParsed <- function(res, test_label) {
  rows <- list()
  for (name in names(res)) {
    v <- res[[name]]
    if (is.null(v) || length(v) == 0) next
    if (is.numeric(v) && length(v) == 1) {
      rows[[length(rows) + 1]] <- list(name, .FmtNum(v))
    } else if (is.character(v)) {
      rows[[length(rows) + 1]] <- list(name, as.character(v))
    }
  }
  list(
    sections = list(list(
      title = sprintf("検出力分析 (%s)", test_label),
      table = list(headers = c("項目", "値"), rows = rows)
    ))
  )
}

RunPower <- function(df, options) {
  test_type <- if (is.null(options$test_type)) "t" else options$test_type
  res <- switch(test_type,
    t = .PowerTTest(options),
    anova = .PowerAnova(options),
    prop = .PowerProp(options),
    stop(sprintf("未対応の検出力テスト: %s", test_type))
  )
  label <- switch(test_type,
    t = "t検定",
    anova = "一元配置分散分析",
    prop = "比率の差"
  )
  .PowerParsed(res, label)
}
