use std::error::Error as StdError;
use std::fmt;

use crate::ffi;

/// エンジンが返した状態コードの区分。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum ErrorKind {
    /// 入力が公開 API の前提を満たしていない。呼び出し側のコードを直せば消える。
    InvalidArgument,
    /// エンジンが確保に失敗した。この区分だけは文面を持たない。
    OutOfMemory,
    /// エンジン側の欠陥。呼び出し側に直せるものがない。
    Unknown,
}

impl ErrorKind {
    /// 文面がないときの代わり。エンジンのメッセージと同じく英語の1文にする。
    fn describe(self) -> &'static str {
        match self {
            Self::InvalidArgument => "The engine rejected the input.",
            Self::OutOfMemory => "The engine ran out of memory.",
            Self::Unknown => "The engine failed for an unknown reason.",
        }
    }
}

/// エンジンの呼び出しが失敗したこと。
///
/// 文面はエンジンが組み立てた英語の1文で、画面に出す日本語はこれを訳すのではなく
/// `kind` と診断から GUI 側が組み立てる。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Error {
    kind: ErrorKind,
    message: Option<String>,
}

impl Error {
    /// 成功以外の状態コードから作る。
    pub(crate) fn from_status(status: ffi::SaiStatus,
                              message: Option<String>)
                              -> Self {
        // 知らないコードを成功側へ倒さないため、既知の2つ以外は Unknown にする。
        let kind = match status {
            ffi::SAI_STATUS_INVALID_ARGUMENT => ErrorKind::InvalidArgument,
            ffi::SAI_STATUS_OUT_OF_MEMORY => ErrorKind::OutOfMemory,
            _ => ErrorKind::Unknown,
        };
        Self { kind, message }
    }

    pub fn kind(&self) -> ErrorKind {
        self.kind
    }

    pub fn message(&self) -> Option<&str> {
        self.message.as_deref()
    }
}

impl fmt::Display for Error {
    fn fmt(&self,
           f: &mut fmt::Formatter<'_>)
           -> fmt::Result {
        f.write_str(self.message.as_deref().unwrap_or_else(|| self.kind.describe()))
    }
}

impl StdError for Error {}
