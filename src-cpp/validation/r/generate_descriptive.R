# Run from the repository root with the reference R environment activated.
# Rscript src-cpp/validation/r/generate_descriptive.R
# This script regenerates fixtures deliberately; review numerical changes.
if (!requireNamespace("psych", quietly = TRUE)) {
  stop("The reference environment requires psych; no packages are installed automatically.")
}

out <- "src-cpp/tests/fixtures/descriptive"
dir.create(out, recursive = TRUE, showWarnings = FALSE)
cases <- list(
  iris_sepal_length = datasets::iris$Sepal.Length,
  iris_sepal_width = datasets::iris$Sepal.Width,
  iris_petal_length = datasets::iris$Petal.Length,
  iris_petal_width = datasets::iris$Petal.Width,
  airquality_ozone = datasets::airquality$Ozone,
  airquality_solar = datasets::airquality$Solar.R,
  airquality_wind = datasets::airquality$Wind,
  airquality_temp = datasets::airquality$Temp
)
number <- function(x) sprintf("%.17g", x)
for (name in names(cases)) {
  x <- cases[[name]]
  valid <- x[!is.na(x)]
  stopifnot(length(valid) >= 4, stats::var(valid) >= 1e-20)
  expected <- c(mean(valid), stats::sd(valid), min(valid), median(valid), max(valid),
                psych::skew(valid, type = 2), psych::kurtosi(valid, type = 2))
  stopifnot(all(is.finite(expected)))
  lines <- c(
    paste(length(x), length(valid), sum(is.na(x))),
    paste(number(expected), collapse = " "),
    ifelse(is.na(x), "NA", number(x))
  )
  writeLines(lines, file.path(out, paste0(name, ".txt")))
}
writeLines(c(
  "# Descriptive reference fixtures",
  "",
  paste("Generated with", R.version.string),
  paste("datasets:", packageVersion("datasets"), "psych:", packageVersion("psych")),
  "",
  "Source: the iris and airquality objects in R's datasets package; see help(iris) and help(airquality).",
  "Generator: src-cpp/validation/r/generate_descriptive.R (run from repository root).",
  "No rows are reordered or dropped from the saved inputs. NA is a missing row.",
  "Reference calculations omit NA separately for each column. No case weights are used.",
  "Mean, SD, minimum, median and maximum use base R/stats; skew and kurtosis use psych type=2.",
  "The eight reference columns satisfy the SPSS sample-size and variance cutoffs.",
  "",
  "File format:",
  "1. Total count, valid count, missing count.",
  "2. Mean, sample SD, minimum, median, maximum, corrected skewness, corrected excess kurtosis.",
  "3. One input value per remaining line, or NA. Numbers use 17 significant digits.",
  "",
  "Both optional statistics are enabled. Counts must match exactly.",
  "Numeric tolerance: absolute 1e-12 plus relative 1e-10 times the expected magnitude.",
  "These are R reference values, not measured outputs from the SPSS application."
), file.path(out, "README.md"))
cat("Generated", length(cases), "descriptive reference fixtures in", out, "\n")
