# 配布版は同梱パッケージと R の標準ライブラリのみを使う。
# アプリ内で renv の復元や書込みを行わない。
local({
  directory <- dirname(Sys.getenv("R_PROFILE_USER"))
  runtime <- read.dcf(file.path(directory, "runtime.dcf"))
  if (as.character(getRversion()) != runtime[1, "RVersion"] ||
      R.version$arch != runtime[1, "Arch"]) {
    stop(sprintf("このアプリには R %s (%s) が必要です。現在は R %s (%s) です",
                 runtime[1, "RVersion"], runtime[1, "Arch"], getRversion(), R.version$arch))
  }
  .libPaths(c(file.path(directory, "library"), .Library), include.site = FALSE)
})
