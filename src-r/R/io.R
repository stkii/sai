# IO functions for CLI

ReadJsonFile <- function(path) {
  info <- tryCatch(file.info(path), error = function(e) NULL)
  if (is.null(info)) stop(paste0("Failed to stat input path: ", path))
  if (isTRUE(info$isdir)) stop(paste0("Input path is a directory (expected file): ", path))
  txt <- tryCatch(paste(readLines(path, warn = FALSE), collapse = "\n"), error = function(e) {
    stop(paste0("Failed to read JSON file: ", path, " (", e$message, ")"))
  })
  jsonlite::fromJSON(txt)
}

WriteJsonFile <- function(path, obj) {
  txt <- jsonlite::toJSON(obj, auto_unbox = TRUE, na = "null")
  con <- file(path, open = "w", encoding = "UTF-8")
  on.exit(try(close(con), silent = TRUE), add = TRUE)
  writeLines(txt, con = con, sep = "\n", useBytes = TRUE)
}
