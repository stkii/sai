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

.PowerLabel <- function(name) {
  labels <- c(
    n = "サンプルサイズ n",
    delta = "効果量 delta",
    sd = "標準偏差",
    sig.level = "有意水準 α",
    power = "検出力 (1−β)",
    type = "検定タイプ",
    alternative = "対立仮説",
    groups = "群数",
    between.var = "群間分散",
    within.var = "群内分散",
    p1 = "比率1",
    p2 = "比率2"
  )
  if (name %in% names(labels)) labels[[name]] else name
}

.PowerValue <- function(name, v) {
  if (name == "type") {
    return(switch(v,
      one.sample = "1標本",
      two.sample = "2標本 (独立)",
      paired = "対応あり",
      v
    ))
  }
  if (name == "alternative") {
    return(switch(v, two.sided = "両側", one.sided = "片側", v))
  }
  as.character(v)
}

.PowerParsed <- function(res, test_label) {
  rows <- list()
  for (name in names(res)) {
    # method は節タイトルと重複するため表示しない。note は表の注記として扱う。
    if (name %in% c("method", "note")) next
    v <- res[[name]]
    if (is.null(v) || length(v) == 0) next
    if (is.numeric(v) && length(v) == 1) {
      rows[[length(rows) + 1]] <- list(.PowerLabel(name), .FmtNum(v))
    } else if (is.character(v)) {
      rows[[length(rows) + 1]] <- list(.PowerLabel(name), .PowerValue(name, v))
    }
  }
  table <- list(headers = c("項目", "値"), rows = rows)
  if (!is.null(res$note)) {
    # base R の note は「n は各群の数」の旨。既知の文言は日本語化し、未知はそのまま表示する
    table$note <- if (grepl("each", res$note, fixed = TRUE)) {
      "n は各群のサンプルサイズです"
    } else {
      as.character(res$note)
    }
  }
  list(
    sections = list(list(
      title = sprintf("検出力分析 (%s)", test_label),
      table = table
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
