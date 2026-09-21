# Descriptive reference fixtures

Generated with R version 4.6.1 (2026-06-24)
datasets: 4.6.1 psych: 2.6.5

Source: the iris and airquality objects in R's datasets package; see help(iris) and help(airquality).
Generator: src-cpp/validation/r/generate_descriptive.R (run from repository root).
No rows are reordered or dropped from the saved inputs. NA is a missing row.
Reference calculations omit NA separately for each column. No case weights are used.
Mean, SD, minimum, median and maximum use base R/stats; skew and kurtosis use psych type=2.
The eight reference columns satisfy the SPSS sample-size and variance cutoffs.

File format:
1. Total count, valid count, missing count.
2. Mean, sample SD, minimum, median, maximum, corrected skewness, corrected excess kurtosis.
3. One input value per remaining line, or NA. Numbers use 17 significant digits.

Both optional statistics are enabled. Counts must match exactly.
Numeric tolerance: absolute 1e-12 plus relative 1e-10 times the expected magnitude.
These are R reference values, not measured outputs from the SPSS application.
