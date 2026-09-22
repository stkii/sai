use crate::ffi;

/// このクレートが結び付いている統計エンジンの識別子。結果を保存した側が、
/// どの実装が計算したものかを後から見分けるために使う。
pub const ENGINE_NAME: &str = "sai-cpp";

/// リンクされている C++ エンジンのバージョン。`src-cpp/CMakeLists.txt` の
/// プロジェクトバージョンがそのまま出る。
pub fn engine_version() -> &'static str {
    ffi::engine_version()
}
