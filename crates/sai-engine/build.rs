use std::env;
use std::path::PathBuf;

const ENGINE_DIR: &str = "../../src-cpp";

/// 変更を監視する入力。cargo の既定はクレートの中だけを見るので、その外にある
/// src-cpp/ は自分で挙げないと再ビルドされない。
const ENGINE_INPUTS: [&str; 4] = ["CMakeLists.txt", "include", "src", "adapters"];

fn main() {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("cargo が設定する"));
    let engine_dir = manifest_dir.join(ENGINE_DIR)
                                 .canonicalize()
                                 .expect("src-cpp/ が crates/sai-engine/ の2階層上にある");

    println!("cargo::rerun-if-changed=build.rs");
    for input in ENGINE_INPUTS {
        println!("cargo::rerun-if-changed={}", engine_dir.join(input).display());
    }

    // SAI_BUILD_TESTS の既定はトップレベルプロジェクトかどうかで決まり、ここでは
    // src-cpp/ がトップレベルになる。切らないと cargo build のたびに GoogleTest を
    // 取得してエンジンのテストまでビルドする。
    let output_dir = cmake::Config::new(&engine_dir).define("SAI_BUILD_TESTS", "OFF")
                                                    .build_target("sai_c_api")
                                                    .build();

    println!("cargo::rustc-link-search=native={}",
             output_dir.join("build").display());
    // 静的ライブラリは依存を持ち運ばないので、sai_c_api が使う sai も並べる。
    // 未解決シンボルは後ろの書庫から解決されるため、順番を入れ替えられない。
    println!("cargo::rustc-link-lib=static=sai_c_api");
    println!("cargo::rustc-link-lib=static=sai");
    if let Some(name) = cxx_standard_library() {
        println!("cargo::rustc-link-lib=dylib={name}");
    }
}

/// rustc が繋ぐのは C のランタイムだけなので、C++ 標準ライブラリは自分で指定する。
/// MSVC はオブジェクトファイル側の指示で解決されるため、何も足さない。
fn cxx_standard_library() -> Option<&'static str> {
    if env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc") {
        return None;
    }
    let target_os = env::var("CARGO_CFG_TARGET_OS").expect("cargo が設定する");
    match target_os.as_str() {
        "macos" | "ios" | "tvos" | "visionos" | "watchos" | "freebsd" | "openbsd" => Some("c++"),
        _ => Some("stdc++"),
    }
}
