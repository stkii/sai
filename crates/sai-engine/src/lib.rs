//! SAI の C++ 統計エンジンを Rust から呼ぶためのクレート。
//!
//! 生の FFI 宣言と解放手順は `ffi` に閉じ込め、公開する API にはポインターも
//! 状態コードも出さない。エンジンのビルドとリンクは build.rs が行うので、
//! 利用側は依存として並べるだけでよい。

mod column;
mod error;
mod ffi;

pub use column::{
    ColumnCounts,
    MISSING_MASK_MISSING,
    MISSING_MASK_PRESENT,
    NumericColumn,
};
pub use error::{
    Error,
    ErrorKind,
};
