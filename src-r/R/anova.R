# ワイド形式を縦持ちにしたときの内部列名。分散分析表の「層」に現れるため、
# ユーザーが読める語にする。元データの列名とは衝突しない (新しい df を作るため)。
.WIDE_SUBJECT_COL <- "被験者"
.WIDE_VALUE_COL <- "測定値"

# ワイド形式 (1行 = 1被験者、1列 = 1条件) を縦持ちへ変換する。
# 被験者IDは行番号。ワイドでは行そのものが被験者であり、どの行が同じ人かを
# データの形が保証しているため、並び順に対する推測は発生しない。
.WideToLong <- function(df, conditions, factor_name) {
  coerced <- lapply(conditions, function(cn) .CoerceNumeric(df[[cn]]))
  long <- data.frame(
    rep(seq_len(nrow(df)), times = length(conditions)),
    unlist(lapply(coerced, `[[`, "values"), use.names = FALSE),
    rep(conditions, each = nrow(df)),
    stringsAsFactors = FALSE,
    check.names = FALSE
  )
  colnames(long) <- c(.WIDE_SUBJECT_COL, .WIDE_VALUE_COL, factor_name)
  counts <- setNames(vapply(coerced, `[[`, integer(1), "failed"), conditions)
  list(df = long, coercion_note = .CoercionNote(counts))
}

# drop1(scope = ~.) が各項の Type III 平方和を返す。誤差行を足し、summary(aov) と
# 同じ列名・行構成へ揃えることで .AnovaParsed を between / within で共用する。
.TypeIIITable <- function(fit) {
  dropped <- drop1(fit, scope = ~., test = "F")
  terms <- setdiff(rownames(dropped), "<none>")
  degf <- c(dropped[terms, "Df"], fit$df.residual)
  ss <- c(dropped[terms, "Sum of Sq"], sum(resid(fit)^2))
  out <- data.frame(
    Df = degf,
    "Sum Sq" = ss,
    "Mean Sq" = ss / degf,
    "F value" = c(dropped[terms, "F value"], NA_real_),
    "Pr(>F)" = c(dropped[terms, "Pr(>F)"], NA_real_),
    check.names = FALSE
  )
  rownames(out) <- c(terms, "Residuals")
  out
}

# 平方和は Type III (効果符号化の下で当該項の列だけを計画行列から除いたときの残差
# 平方和の増分)。逐次分解の Type I はセル度数が不均衡だと項の投入順に依存し、
# 同じデータでも要因を選んだ順で F 値と p 値が変わる。
.AnovaBetween <- function(df, dependent, factors) {
  for (f in factors) df[[f]] <- as.factor(df[[f]])
  formula <- as.formula(
    sprintf("`%s` ~ %s", dependent, paste(sprintf("`%s`", factors), collapse = " * "))
  )
  # contr.sum は lm の引数で渡す。options(contrasts=) を書き換えると同一プロセス内の
  # 後続の推定まで符号化が変わる
  contrasts <- setNames(rep(list("contr.sum"), length(factors)), factors)
  fit <- lm(formula, data = df, contrasts = contrasts)
  list(fit = fit, table = .TypeIIITable(fit))
}

# aov の層名 ("Error: subj:cond") を研究者の語彙へ直す。R の Error は失敗ではなく
# 誤差項の分割単位を指すが、そのまま出すとエラー表示に読める。
# 被験者のみの層は被験者間、それ以外は誤差項に対応する要因を括弧で残す。
.StratumLabel <- function(strat, subject) {
  body <- sub("^Error: ", "", strat)
  if (identical(body, subject)) return("被験者間")
  prefix <- paste0(subject, ":")
  if (!startsWith(body, prefix)) return(body)
  terms <- substring(body, nchar(prefix) + 1)
  sprintf("被験者内 (%s)", gsub(":", " × ", terms, fixed = TRUE))
}

# aov の項名は桁揃えの空白を含み、誤差項は "Residuals" のまま返る。
# 表の他の列が日本語なので、余白を落として言い換える。
.AnovaTermLabel <- function(term) {
  label <- trimws(term)
  if (identical(label, "Residuals")) "誤差" else label
}

# 誤差項の行は F 比の分母そのもので、F 値と p 値が定義されない。計算に失敗した
# 結果と読み違えられないよう、相関行列の対角と同じ "—" で表す。
.FmtAnovaF <- function(x) if (length(x) == 0 || is.na(x)) "—" else .FmtNum(x)

.FmtAnovaP <- function(p) if (length(p) == 0 || is.na(p)) "—" else paste0(.FmtP(p), .Stars(p))

# 反復測定の平方和は、各被験者が全セルをちょうど1回ずつ持つ前提で誤差項へ分解される。
# セルが欠けても aov は値を返してしまうため、分解が成立していないことを注記で伝える。
.RepeatedBalanceNote <- function(df, subject, factors) {
  cells <- table(
    as.character(df[[subject]]),
    do.call(paste, c(unname(as.list(df[factors])), list(sep = ":")))
  )
  if (all(cells == 1)) return(NULL)
  "一部の被験者で条件の観測が1つずつ揃っていないため、平方和は解釈できません"
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
    tbl_df$Stratum <- .StratumLabel(strat, subject)
    tbl_df
  }))
  list(fit = fit, table = rows_combined)
}

# 反復測定は Error() 分解で層が増え、項名も行名ではなく列として持つ。
# 統計量の列は両者で共通なので、先頭のラベル列だけを design で切り替える。
.AnovaParsed <- function(table, design) {
  stratified <- design == "within"
  label_headers <- if (stratified) c("層", "項") else "項"

  rows <- list()
  for (i in seq_len(nrow(table))) {
    labels <- if (stratified) {
      list(as.character(table$Stratum[i]), .AnovaTermLabel(as.character(table$Term[i])))
    } else {
      list(.AnovaTermLabel(rownames(table)[i]))
    }
    rows[[length(rows) + 1]] <- c(labels, list(
      .FmtNum(table[i, "Df"]),
      .FmtNum(table[i, "Sum Sq"]),
      .FmtNum(table[i, "Mean Sq"]),
      .FmtAnovaF(table[i, "F value"]),
      .FmtAnovaP(table[i, "Pr(>F)"])
    ))
  }

  list(
    headers = c(label_headers, "Df", "平方和", "平均平方", "F値", "p値"),
    rows = rows,
    note = "*** p < .001, ** p < .01, * p < .05"
  )
}

RunAnova <- function(df, options) {
  design <- if (is.null(options$design)) "between" else options$design
  layout <- if (is.null(options$dataLayout)) "long" else options$dataLayout
  if (!layout %in% c("long", "wide")) stop(sprintf("未対応のデータ形式: %s", layout))
  if (layout == "wide" && design != "within") {
    stop("ワイド形式は反復測定デザインでのみ指定できます")
  }

  n_conditions <- NA_integer_

  if (layout == "wide") {
    conditions <- if (is.null(options$conditions)) list() else options$conditions
    if (is.list(conditions)) conditions <- unlist(conditions)
    factor_name <- if (is.null(options$factorName)) "" else options$factorName

    if (length(conditions) < 2) stop("ワイド形式では条件に対応する列を2つ以上指定してください")
    if (nchar(factor_name) == 0) stop("被験者内要因の名前が指定されていません")
    if (factor_name %in% c(.WIDE_SUBJECT_COL, .WIDE_VALUE_COL)) {
      stop(sprintf("被験者内要因の名前に '%s' は使用できません", factor_name))
    }
    for (cn in conditions) {
      if (!(cn %in% colnames(df))) stop(sprintf("条件の列 '%s' がデータにありません", cn))
    }

    wide <- .WideToLong(df, conditions, factor_name)
    df <- wide$df
    dependent <- .WIDE_VALUE_COL
    subject <- .WIDE_SUBJECT_COL
    factors <- factor_name
    coercion_note <- wide$coercion_note
    n_conditions <- length(conditions)
  } else {
    dependent <- options$dependent
    factors <- if (is.null(options$factors)) list() else options$factors
    if (is.list(factors)) factors <- unlist(factors)

    subject <- if (design == "within") options$subject else NULL

    if (is.null(dependent) || nchar(dependent) == 0) stop("従属変数が指定されていません")
    if (length(factors) == 0) stop("要因が指定されていません")
    if (!(dependent %in% colnames(df))) stop(sprintf("従属変数 '%s' がデータにありません", dependent))
    for (f in factors) {
      if (!(f %in% colnames(df))) stop(sprintf("要因 '%s' がデータにありません", f))
    }
    if (design == "within") {
      if (is.null(subject) || nchar(subject) == 0) stop("反復測定では被験者ID列の指定が必要です")
      if (!(subject %in% colnames(df))) {
        stop(sprintf("被験者ID列 '%s' がデータにありません", subject))
      }
    }

    coerced <- .CoerceNumeric(df[[dependent]])
    df[[dependent]] <- coerced$values
    coercion_note <- .CoercionNote(setNames(coerced$failed, dependent))
  }

  before <- nrow(df)
  keep <- complete.cases(df[, c(dependent, factors, subject), drop = FALSE])
  if (layout == "wide") {
    # 1条件でも欠けた被験者は反復測定の計画から外れるため、行単位ではなく被験者単位で除外する
    keep <- !(df[[subject]] %in% unique(df[[subject]][!keep]))
  }
  df <- df[keep, , drop = FALSE]
  after <- nrow(df)
  if (after < length(factors) + 2) stop("有効な観測が不足しています")

  if (design == "within") {
    res <- .AnovaWithin(df, dependent, subject, factors)
    parsed <- .AnovaParsed(res$table, "within")
    # 反復測定の注記に加え、リストワイズ削除や数値変換が起きた場合もその事実を必ず通知する
    base_note <- "反復測定デザインのため、サンプルサイズは総観測数（被験者数 × 条件数）です"
    # 行を被験者と見なしたことは分析の前提そのものなので、ワイド形式では必ず明示する
    wide_note <- if (layout == "wide") {
      sprintf(
        "ワイド形式のため、各行を1人の被験者として扱いました (%d人 × %d条件)",
        after %/% n_conditions, n_conditions
      )
    } else {
      NULL
    }
    list(
      sections = list(list(title = "分散分析表 (反復測定)", table = parsed)),
      n = after,
      n_note = .MergeNotes(
        base_note,
        .RepeatedBalanceNote(df, subject, factors),
        wide_note,
        .ListwiseNote(before - after),
        coercion_note
      )
    )
  } else {
    res <- .AnovaBetween(df, dependent, factors)
    parsed <- .AnovaParsed(res$table, "between")
    list(
      sections = list(list(title = "分散分析表", table = parsed)),
      n = after,
      n_note = .MergeNotes(.ListwiseNote(before - after), coercion_note)
    )
  }
}
