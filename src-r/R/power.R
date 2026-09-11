# 検定ごとの入力項目 (option キー → 表示名)。空欄の数と定義域の検証に使い、
# 未対応の検定の判定も兼ねる。有意水準はモーダルが常に送るため空欄には数えない。
.POWER_FIELDS <- list(
  t = list(
    n = "サンプルサイズ n",
    effect_size = "効果量 delta",
    power = "検出力 (1−β)"
  ),
  anova = list(
    groups = "群数",
    n = "サンプルサイズ n",
    between_var = "群間分散",
    within_var = "群内分散",
    power = "検出力 (1−β)"
  ),
  prop = list(
    n = "サンプルサイズ n",
    p1 = "比率1",
    p2 = "比率2",
    power = "検出力 (1−β)"
  )
)

# 0 < v < 1 を満たす必要がある項目
.POWER_UNIT_INTERVAL <- c("power", "p1", "p2", "sig_level")

# v > 0 を満たす必要がある項目
.POWER_POSITIVE <- c("between_var", "within_var")

# power.*.test は解として求める1つだけが NULL であることを要求し、外れると
# 英語の stopifnot 表現を返す。どの項目のことか GUI からは追えないため先に検証する。
.PowerValidate <- function(opts, fields) {
  labels <- unlist(fields, use.names = FALSE)
  blank <- vapply(names(fields), function(k) is.null(opts[[k]]), logical(1))

  if (sum(blank) == 0) {
    stop(sprintf(
      "求めたい項目を1つ空欄にしてください (%s のいずれか)",
      paste(labels, collapse = ", ")
    ))
  }
  if (sum(blank) > 1) {
    stop(sprintf(
      "空欄にできるのは1つだけです。%d個が空欄です: %s",
      sum(blank), paste(labels[blank], collapse = ", ")
    ))
  }

  checked <- c(fields, list(sig_level = "有意水準 α"))
  for (k in names(checked)) {
    v <- opts[[k]]
    if (is.null(v)) next
    label <- checked[[k]]
    if (!is.numeric(v) || length(v) != 1 || !is.finite(v)) {
      stop(sprintf("%s は数値で指定してください", label))
    }
    if (k %in% .POWER_UNIT_INTERVAL && (v <= 0 || v >= 1)) {
      stop(sprintf("%s は0より大きく1より小さい値で指定してください", label))
    }
    if (k %in% .POWER_POSITIVE && v <= 0) {
      stop(sprintf("%s は正の数で指定してください", label))
    }
    # 2群未満・2観測未満では検定統計量が定義されない
    if (k == "groups" && v < 2) stop(sprintf("%s は2以上で指定してください", label))
    if (k == "n" && v < 2) stop(sprintf("%s は2以上で指定してください", label))
  }
}

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
  fields <- .POWER_FIELDS[[test_type]]
  if (is.null(fields)) stop(sprintf("未対応の検出力テスト: %s", test_type))
  .PowerValidate(options, fields)

  res <- switch(test_type,
    t = .PowerTTest(options),
    anova = .PowerAnova(options),
    prop = .PowerProp(options)
  )
  label <- switch(test_type,
    t = "t検定",
    anova = "一元配置分散分析",
    prop = "比率の差"
  )
  .PowerParsed(res, label)
}
