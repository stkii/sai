# default profile の renv.lock と一致する導入済みパッケージだけを同梱する。
# ビルド中の自動インストールや別の版への置換はしない。
lock <- jsonlite::read_json("renv.lock")
packages <- lapply(Filter(function(p) p$Package != "renv", lock$Packages), function(pkg) {
  path <- find.package(pkg$Package, quiet = TRUE)
  if (length(path) == 0 || packageVersion(pkg$Package) != package_version(pkg$Version)) {
    stop(sprintf("%s %s が必要です。default profile で renv::restore() を実行してください",
                 pkg$Package, pkg$Version))
  }
  list(name = pkg$Package, path = normalizePath(path))
})
jsonlite::write_json(list(
  rVersion = as.character(getRversion()),
  arch = R.version$arch,
  packages = unname(packages)
), commandArgs(trailingOnly = TRUE)[[1]], auto_unbox = TRUE)
