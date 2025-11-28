# Cohen's (conventional) effect size thresholds for "small" effect across different statistical tests
COHEN_ES <- c(
  "anov" = 0.1,      # One-way ANOVA
  "chisq" = 0.1,     # Chi-squared test
  "f2" = 0.02,       # General linear model
  "p" = 0.1,         # One-sample proportion test
  "r" = 0.1,         # Pearson correlation
  "t" = 0.2          # t-test
)
