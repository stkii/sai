.Skewness <- function(x) {
  n <- length(x)
  if (n < 3) return(NA_real_)
  s <- sd(x)
  if (is.na(s) || s == 0) return(NA_real_)
  m <- mean(x)
  (n / ((n - 1) * (n - 2))) * sum(((x - m) / s)^3)
}

.Kurtosis <- function(x) {
  n <- length(x)
  if (n < 4) return(NA_real_)
  s <- sd(x)
  if (is.na(s) || s == 0) return(NA_real_)
  m <- mean(x)
  ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum(((x - m) / s)^4) -
    (3 * (n - 1)^2) / ((n - 2) * (n - 3))
}

.Describe <- function(df, include_skewness = FALSE, include_kurtosis = FALSE) {
  stats <- list()
  for (col in colnames(df)) {
    x <- df[[col]]
    x <- x[!is.na(x)]
    n <- length(x)
    if (n == 0) {
      entry <- list(
        n = 0, mean = NA_real_, sd = NA_real_,
        min = NA_real_, max = NA_real_, median = NA_real_,
        skewness = NA_real_, kurtosis = NA_real_
      )
    } else {
      entry <- list(
        n = n,
        mean = mean(x),
        sd = if (n >= 2) sd(x) else NA_real_,
        min = min(x),
        max = max(x),
        median = median(x),
        skewness = if (include_skewness) .Skewness(x) else NA_real_,
        kurtosis = if (include_kurtosis) .Kurtosis(x) else NA_real_
      )
    }
    stats[[col]] <- entry
  }
  stats
}

.SortColumns <- function(stats, mode) {
  if (mode == "default" || length(stats) <= 1) return(stats)
  means <- vapply(stats, function(s) {
    v <- s$mean
    if (is.null(v) || is.na(v)) NA_real_ else v
  }, numeric(1))
  decreasing <- mode == "mean_desc"
  ord <- order(means, decreasing = decreasing, na.last = TRUE)
  stats[ord]
}

.DescribeParsed <- function(stats, include_skewness = FALSE, include_kurtosis = FALSE) {
  base_headers <- c("変数", "n", "平均", "標準偏差", "最小値", "中央値", "最大値")
  extra_headers <- character(0)
  if (include_skewness) extra_headers <- c(extra_headers, "歪度")
  if (include_kurtosis) extra_headers <- c(extra_headers, "尖度")
  headers <- c(base_headers, extra_headers)
  rows <- list()
  for (name in names(stats)) {
    s <- stats[[name]]
    row <- list(
      name,
      format(s$n, scientific = FALSE),
      .FmtNum(s$mean),
      .FmtNum(s$sd),
      .FmtNum(s$min),
      .FmtNum(s$median),
      .FmtNum(s$max)
    )
    if (include_skewness) row[[length(row) + 1]] <- .FmtNum(s$skewness)
    if (include_kurtosis) row[[length(row) + 1]] <- .FmtNum(s$kurtosis)
    rows[[length(rows) + 1]] <- row
  }
  list(headers = headers, rows = rows)
}

RunDescribe <- function(df, options) {
  if (ncol(df) == 0) stop("変数が選択されていません")

  sort_mode <- if (is.null(options$sort)) "default" else options$sort
  if (!sort_mode %in% c("default", "mean_desc", "mean_asc")) {
    stop(sprintf("未対応の表示順: %s", sort_mode))
  }
  extras <- if (is.null(options$extras)) list() else options$extras
  include_skewness <- isTRUE(extras$skewness)
  include_kurtosis <- isTRUE(extras$kurtosis)

  stats <- .Describe(df, include_skewness, include_kurtosis)
  stats <- .SortColumns(stats, sort_mode)
  parsed <- .DescribeParsed(stats, include_skewness, include_kurtosis)

  list(
    sections = list(list(
      title = "記述統計",
      table = parsed
    )),
    n = nrow(df)
  )
}
