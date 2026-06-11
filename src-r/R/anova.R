.AnovaBetween <- function(df, dependent, factors) {
  for (f in factors) df[[f]] <- as.factor(df[[f]])
  formula <- as.formula(
    sprintf("`%s` ~ %s", dependent, paste(sprintf("`%s`", factors), collapse = " * "))
  )
  fit <- aov(formula, data = df)
  list(fit = fit, table = summary(fit)[[1]])
}

.AnovaWithin <- function(df, dependent, subject, within_factors) {
  for (f in within_factors) df[[f]] <- as.factor(df[[f]])
  df[[subject]] <- as.factor(df[[subject]])
  inner <- paste(sprintf("`%s`", within_factors), collapse = " * ")
  formula <- as.formula(
    sprintf("`%s` ~ %s + Error(`%s`/(%s))", dependent, inner, subject, inner)
  )
  fit <- aov(formula, data = df)
  s <- summary(fit)
  # Error() を含む aov の summary は list of list. 平坦化する。
  rows_combined <- do.call(rbind, lapply(names(s), function(strat) {
    tbl <- s[[strat]][[1]]
    if (is.null(tbl)) return(NULL)
    tbl_df <- as.data.frame(tbl, check.names = FALSE)
    tbl_df$Term <- rownames(tbl)
    tbl_df$Stratum <- strat
    tbl_df
  }))
  list(fit = fit, table = rows_combined)
}

.AnovaParsed <- function(table, design) {
  if (design == "between") {
    headers <- c("項", "Df", "平方和", "平均平方", "F値", "p値")
    rows <- list()
    for (i in seq_len(nrow(table))) {
      p <- table[i, "Pr(>F)"]
      rows[[length(rows) + 1]] <- list(
        rownames(table)[i],
        .FmtNum(table[i, "Df"]),
        .FmtNum(table[i, "Sum Sq"]),
        .FmtNum(table[i, "Mean Sq"]),
        .FmtNum(table[i, "F value"]),
        sprintf("%s%s", .FmtP(p), .Stars(p))
      )
    }
    list(headers = headers, rows = rows, note = "*** p < .001, ** p < .01, * p < .05")
  } else {
    headers <- c("層", "項", "Df", "平方和", "平均平方", "F値", "p値")
    rows <- list()
    for (i in seq_len(nrow(table))) {
      p <- table[i, "Pr(>F)"]
      rows[[length(rows) + 1]] <- list(
        as.character(table$Stratum[i]),
        as.character(table$Term[i]),
        .FmtNum(table[i, "Df"]),
        .FmtNum(table[i, "Sum Sq"]),
        .FmtNum(table[i, "Mean Sq"]),
        .FmtNum(table[i, "F value"]),
        sprintf("%s%s", .FmtP(p), .Stars(p))
      )
    }
    list(headers = headers, rows = rows, note = "*** p < .001, ** p < .01, * p < .05")
  }
}

RunAnova <- function(df, options) {
  dependent <- options$dependent
  factors <- if (is.null(options$factors)) list() else options$factors
  if (is.list(factors)) factors <- unlist(factors)
  design <- if (is.null(options$design)) "between" else options$design

  if (is.null(dependent) || nchar(dependent) == 0) stop("従属変数が指定されていません")
  if (length(factors) == 0) stop("要因が指定されていません")
  if (!(dependent %in% colnames(df))) stop(sprintf("従属変数 '%s' がデータにありません", dependent))
  for (f in factors) {
    if (!(f %in% colnames(df))) stop(sprintf("要因 '%s' がデータにありません", f))
  }
  df[[dependent]] <- suppressWarnings(as.numeric(df[[dependent]]))

  before <- nrow(df)
  needed_cols <- c(dependent, factors)
  if (!is.null(options$subject)) needed_cols <- c(needed_cols, options$subject)
  df <- df[complete.cases(df[, needed_cols, drop = FALSE]), , drop = FALSE]
  after <- nrow(df)
  if (after < length(factors) + 2) stop("有効な観測が不足しています")

  if (design == "within") {
    subject <- options$subject
    if (is.null(subject) || nchar(subject) == 0) stop("反復測定では被験者ID列の指定が必要です")
    res <- .AnovaWithin(df, dependent, subject, factors)
    parsed <- .AnovaParsed(res$table, "within")
    # 反復測定の注記に加え、リストワイズ削除が起きた場合はその事実も必ず通知する
    base_note <- "反復測定デザインのため、サンプルサイズは総観測数（被験者数 × 条件数）です"
    lw_note <- .ListwiseNote(before - after)
    list(
      sections = list(list(title = "分散分析表 (反復測定)", table = parsed)),
      n = after,
      n_note = if (is.null(lw_note)) base_note else paste0(base_note, "。", lw_note)
    )
  } else {
    res <- .AnovaBetween(df, dependent, factors)
    parsed <- .AnovaParsed(res$table, "between")
    list(
      sections = list(list(title = "分散分析表", table = parsed)),
      n = after,
      n_note = .ListwiseNote(before - after)
    )
  }
}
