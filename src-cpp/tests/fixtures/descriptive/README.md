# Descriptive reference fixtures

Generated with R version 4.6.1 (2026-06-24)
datasets: 4.6.1 psych: 2.6.5

Source: the iris and airquality objects in R's datasets package; see help(iris) and help(airquality).
Generator: src-cpp/validation/r/generate_descriptive.R (run from repository root).
No rows are reordered or dropped from the saved inputs. NA is a missing row.
Reference calculations omit NA separately for each column. No case weights are used.
Mean, SD, minimum, median and maximum use base R/stats; skew and kurtosis use psych type=2.
All 8 reference columns satisfy the SPSS sample-size and variance cutoffs,
so none of them exercises a statistic that is not returned. Every expected key is required.

File format:
- Lines starting with # and blank lines are ignored.
- "key = value" until the [values] marker. Keys are the field names of the result.
- After [values], one input value per line, or NA for a missing row.

Both optional statistics are enabled. Counts must match exactly.
Values carry as many significant digits as it takes to read back as the same double.
airquality_solar kurtosis predates that rule and sits one ulp (1.2e-16 relative) from the
value R computed; regenerating widens it by a digit.
Numeric tolerance: the default in src-cpp/docs/NUMERICAL_POLICY.md, which is
absolute 1e-12 plus relative 1e-10 times the expected magnitude. This method does not
override it. The comparison is tests/support/tolerance.hpp.
These are R reference values, not measured outputs from the SPSS application.
