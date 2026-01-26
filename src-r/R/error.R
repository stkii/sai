# Application-wide error code definitions

ERR_MESSAGES <- base::list(
  # Data type
  "ERR-810" = "Invalid data type (must be data.frame)",
  "ERR-811" = "Non-numeric columns detected",
  # Data structure / size
  "ERR-831" = "Not enough numeric columns (need at least two)",
  "ERR-832" = "Missing values detected. Change missing-value handling option.",
  # Design (power analysis) parameter errors (user-caused)
  "ERR-845" = "sig_level must be between 0 and 1",
  "ERR-846" = "power must be between 0 and 1",
  "ERR-847" = "k must be >= 2",
  "ERR-848" = "categories must be >= 2",
  "ERR-849" = "u must be >= 1",
  "ERR-851" = "df must be >= 1",
  "ERR-850" = "effect must be 'small', 'medium', or 'large'",
  # 900 - 999 represents NO user-caused errors
  # R module loading
  "ERR-901" = "R module 'constants.R' not found under src-r/R",
  "ERR-902" = "R module 'describe.R' not found under src-r/R",
  "ERR-903" = "R module 'correlation.R' not found under src-r/R",
  "ERR-904" = "R module 'reliability.R' not found under src-r/R",
  "ERR-905" = "R module 'regression.R' not found under src-r/R",
  "ERR-906" = "R module 'design.R' not found under src-r/R",
  "ERR-907" = "R module 'centering.R' not found under src-r/R",
  "ERR-908" = "R module 'common.R' not found under src-r/R",
  "ERR-909" = "R module 'rotation.R' not found under src-r/R",
  "ERR-910" = "R module 'factor.R' not found under src-r/R",
  "ERR-911" = "R module 'power.R' not found under src-r/R",
  "ERR-920" = "Invalid analysis option",
  "ERR-925" = "EFAtools package is required for factor rotation",
  "ERR-926" = "pwr package is required for power analysis",
  # Internal errors
  "ERR-940" = "Internal error in design module"

  # ------------------------------------------------------------
  # Bootstrap error (defined in cli.R)
  # ------------------------------------------------------------
  # ERR-999: "R core module 'err.R' not found under src-r/R"
  #   - Listed here for reference only.
)

StopWithErrCode <- function(code) {
  msg <- ERR_MESSAGES[[code]]
  if (base::is.null(msg)) {
    base::stop("unknown error code")
  }
  base::stop(base::paste0(code, ": ", msg))
}
