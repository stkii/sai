# IO functions for CLI

ReadJsonFile <- function(path) {
  info <- base::tryCatch(base::file.info(path), error = function(e) NULL)
  if (base::is.null(info)) base::stop(base::paste0("Failed to stat input path: ", path))
  if (base::isTRUE(info$isdir)) base::stop(base::paste0("Input path is a directory (expected file): ", path))
  txt <- base::tryCatch(base::paste(base::readLines(path, warn = FALSE), collapse = "\n"), error = function(e) {
    base::stop(base::paste0("Failed to read JSON file: ", path, " (", e$message, ")"))
  })
  jsonlite::fromJSON(txt)
}

WriteJsonFile <- function(path, obj) {
  txt <- jsonlite::toJSON(obj, auto_unbox = TRUE, na = "null")
  con <- base::file(path, open = "w", encoding = "UTF-8")
  base::on.exit(base::try(base::close(con), silent = TRUE), add = TRUE)
  base::writeLines(txt, con = con, sep = "\n", useBytes = TRUE)
}
