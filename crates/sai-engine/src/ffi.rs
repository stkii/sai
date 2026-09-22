//! `src-cpp/adapters/c_api/include/sai_c.h` が宣言する C ABI を Rust 側で
//! 書き写したもの。ヘッダーの本文は C++ なので bindgen では読めず、署名は
//! 手で揃える。クレートの外へは出さない。

use std::ffi::c_char;
use std::{
    ptr,
    slice,
};

pub(crate) type SaiStatus = i32;

pub(crate) const SAI_STATUS_OK: SaiStatus = 0;
pub(crate) const SAI_STATUS_INVALID_ARGUMENT: SaiStatus = 1;
pub(crate) const SAI_STATUS_OUT_OF_MEMORY: SaiStatus = 2;

#[repr(C)]
pub(crate) struct SaiNumericColumn {
    pub(crate) values: *const f64,
    pub(crate) value_count: usize,
    pub(crate) missing_mask: *const u8,
    pub(crate) missing_mask_count: usize,
    pub(crate) name: *const c_char,
    pub(crate) name_length: usize,
}

#[repr(C)]
#[derive(Clone, Copy, Default)]
pub(crate) struct SaiColumnCounts {
    pub(crate) row_count: usize,
    pub(crate) valid_count: usize,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub(crate) struct SaiErrorMessage {
    data: *const c_char,
    length: usize,
}

unsafe extern "C" {
    pub(crate) fn sai_numeric_column_counts(column: *const SaiNumericColumn,
                                            out_counts: *mut SaiColumnCounts,
                                            out_error: *mut SaiErrorMessage)
                                            -> SaiStatus;

    fn sai_error_message_destroy(message: *mut SaiErrorMessage);
}

/// エンジンが確保したメッセージの所有者。解放手順をこの型の外へ出さないために
/// あり、`SaiErrorMessage` を直接扱う場所をここだけに限る。
pub(crate) struct ErrorMessage {
    message: SaiErrorMessage,
}

impl ErrorMessage {
    pub(crate) fn empty() -> Self {
        Self { message: SaiErrorMessage { data: ptr::null(),
                                          length: 0 } }
    }

    pub(crate) fn as_mut_ptr(&mut self) -> *mut SaiErrorMessage {
        &raw mut self.message
    }

    pub(crate) fn text(&self) -> Option<String> {
        if self.message.data.is_null() {
            return None;
        }
        // length に終端は含まれない。エンジンが書くのは英語1文なので、
        // 不正な UTF-8 になる経路は現状ない。
        let bytes = unsafe { slice::from_raw_parts(self.message.data.cast::<u8>(), self.message.length) };
        Some(String::from_utf8_lossy(bytes).into_owned())
    }
}

impl Drop for ErrorMessage {
    fn drop(&mut self) {
        unsafe { sai_error_message_destroy(&raw mut self.message) };
    }
}
