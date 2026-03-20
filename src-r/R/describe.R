# ========================
# Descriptive statistics
# ========================

# Execute descriptive statistics
#
# Args:
# - df (data.frame): Dataset containing only numeric values
# - na_ig (logical): Whether to ignore NA values (default TRUE)
#
# Returns:
# - stats (data.frame): A data.frame where each row corresponds to a variable (column) in x,
# and columns are the descriptive statistics:
#   - mean: mean of the variable
#   - sd: standard deviation
#   - min: minimum value
#   - max: maximum value
#
.Describe <- function(df, na_ig=TRUE, skewness=FALSE, kurtosis=FALSE){
  # Receive raw data.
  # Input dataset must be a data frame
  IsDataFrame(df)

  # Calculate base descriptive statistics column-wise
  rows <- list(
    mean   = base::colMeans(df, na.rm=na_ig),
    median = base::apply(df, 2, stats::median, na.rm=na_ig),
    sd     = base::apply(df, 2, stats::sd, na.rm=na_ig),
    min    = base::apply(df, 2, base::min, na.rm=na_ig),
    max    = base::apply(df, 2, base::max, na.rm=na_ig)
  )
  col_names <- c("平均値", "中央値", "標準偏差", "最小値", "最大値")

  if (isTRUE(skewness)) {
    rows$skewness <- base::apply(df, 2, e1071::skewness, na.rm=na_ig, type=2)
    col_names <- c(col_names, "歪度")
  }
  if (isTRUE(kurtosis)) {
    rows$kurtosis <- base::apply(df, 2, e1071::kurtosis, na.rm=na_ig, type=2)
    col_names <- c(col_names, "尖度")
  }

  # Transpose so that rows = variables, columns = statistics
  stats <- base::t(base::do.call(base::rbind, rows))
  base::colnames(stats) <- col_names

  return (stats)
}

# Wrapper to return ParsedDataTable-compatible structure
#
# Args:
# - stats (data.frame): Calculated descriptive statistics from .Describe()
#
# Returns:
# - list(headers=[..], rows=[[..], ...])
#
.DescribeParsed <- function(stats){
  stat_cols <- base::colnames(stats)
  headers <- c("変数", stat_cols)
  vars <- base::rownames(stats)
  if (is.null(vars)) vars <- base::paste0("V", base::seq_len(base::nrow(stats)))

  rows <- base::lapply(base::seq_len(base::nrow(stats)), function(i) {
    vals <- base::vapply(stat_cols, function(col) {
      FormatNum(base::unname(stats[i, col]))
    }, character(1))
    c(vars[[i]], base::unname(vals))
  })

  return(list(headers=headers, rows=rows))
}

# Runner used by CLI dispatcher
#
# Arguments:
# - df (data.frame): numeric dataset
# - order (character): 'default' | 'mean' | 'mean_asc' | 'mean_desc'
# - na_ig (logical): whether to ignore NA values (default TRUE)
#
# Returns:
# - ParsedDataTable-like list(headers, rows)
#
.HistogramBase64 <- function(df, cols, na_ig = TRUE, breaks = "Sturges") {
  n_vars <- base::length(cols)
  if (n_vars == 0L) return(NULL)

  # Determine grid layout: up to 3 columns
  n_cols <- base::min(n_vars, 3L)
  n_rows <- base::ceiling(n_vars / n_cols)

  cell_w <- 280
  cell_h <- 240
  img_w <- cell_w * n_cols
  img_h <- cell_h * n_rows

  tmp <- base::tempfile(fileext = ".png")
  base::on.exit(base::unlink(tmp), add = TRUE)
  grDevices::png(tmp, width = img_w, height = img_h, res = 96)
  graphics::par(mfrow = c(n_rows, n_cols), mar = c(4, 3, 3, 1))

  for (col_name in cols) {
    vals <- df[[col_name]]
    if (isTRUE(na_ig)) vals <- vals[!base::is.na(vals)]
    graphics::hist(vals, main = col_name, xlab = "", ylab = "",
                   col = NA, border = "black", breaks = breaks)
  }

  grDevices::dev.off()
  raw_bytes <- base::readBin(tmp, "raw", base::file.info(tmp)$size)
  base::paste0("data:image/png;base64,", jsonlite::base64_enc(raw_bytes))
}

RunDescriptive <- function(df, order = 'default', na_ig = TRUE, skewness = FALSE, kurtosis = FALSE,
                           histogram = 'none', histogram_variables = NULL, breaks = 'Sturges') {
  ord <- .ValidateOptionInSet(order, c("default", "mean_asc", "mean_desc"))
  na_ig_norm <- .RequireLogicalOption(na_ig)
  ValidateMinRows(df, 2L)

  stats <- .Describe(df, na_ig = na_ig_norm, skewness = skewness, kurtosis = kurtosis)
  table <- .DescribeParsed(stats)

  # Sorting using Sort() utility
  sorter <- Sort(ord)
  table <- sorter(table)

  # Build result as a named list (output_kind = "descriptive")
  result <- list(table = table)

  # Histogram generation
  hist_mode <- .ValidateOptionInSet(histogram, c("none", "all", "selected"))
  # breaks uses lowercase for validation, then maps back to R's expected casing
  breaks_norm <- .ValidateOptionInSet(breaks, c("sturges", "scott", "fd"))
  breaks_r_name <- list(sturges = "Sturges", scott = "Scott", fd = "FD")[[breaks_norm]]
  if (!identical(hist_mode, "none")) {
    hist_cols <- if (identical(hist_mode, "all")) {
      base::colnames(df)
    } else {
      # Filter to columns that actually exist in the dataset
      valid <- histogram_variables[histogram_variables %in% base::colnames(df)]
      if (base::length(valid) == 0L) base::colnames(df) else valid
    }
    result$histogram <- .HistogramBase64(df, hist_cols, na_ig = na_ig_norm, breaks = breaks_r_name)

    breaks_notes <- list(
      "Sturges" = "階級幅はSturgesの公式により算出されています",
      "Scott"   = "階級幅はScottの基準により算出されています",
      "FD"      = "階級幅はFreedman-Diaconisの基準により算出されています"
    )
    result$table$note <- breaks_notes[[breaks_r_name]]
  }

  # Effective sample size: total rows in the input data frame.
  # Descriptive statistics use na.rm=TRUE per column, so each variable
  # may have a different valid-observation count when NAs are present.
  # We report nrow(df) because this is the standard convention for
  # descriptive statistics (e.g., SPSS, SAS) — per-variable N differences
  # are visible in the table output itself.
  result$n <- base::as.integer(base::nrow(df))
  result
}
