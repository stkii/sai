//! `src-cpp/adapters/c_api/include/sai_c.h` が宣言する C ABI を Rust 側で
//! 書き写したもの。ヘッダーの本文は C++ なので bindgen では読めず、署名は
//! 手で揃える。クレートの外へは出さない。

use std::ffi::{
    CStr,
    c_char,
};
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

/// `sai_c.h` の `sai_descriptive_diagnostic_capacity`。統計量1つにつき高々1件
/// なので固定長で足り、結果の受け渡しに確保も解放も現れない。
pub(crate) const SAI_DESCRIPTIVE_DIAGNOSTIC_CAPACITY: usize = 7;

#[repr(C)]
#[derive(Clone, Copy, Default)]
pub(crate) struct SaiOptionalDouble {
    pub(crate) value: f64,
    pub(crate) present: u8,
}

#[repr(C)]
#[derive(Clone, Copy, Default)]
pub(crate) struct SaiDescriptiveOptions {
    pub(crate) include_skewness: u8,
    pub(crate) include_kurtosis: u8,
}

#[repr(C)]
#[derive(Clone, Copy, Default)]
pub(crate) struct SaiDiagnostic {
    pub(crate) code: i32,
    pub(crate) target: *const c_char,
    pub(crate) target_length: usize,
    pub(crate) count: usize,
}

#[repr(C)]
#[derive(Clone, Copy, Default)]
pub(crate) struct SaiDescriptiveResult {
    pub(crate) total_count: usize,
    pub(crate) valid_count: usize,
    pub(crate) missing_count: usize,
    pub(crate) mean: SaiOptionalDouble,
    pub(crate) standard_deviation: SaiOptionalDouble,
    pub(crate) minimum: SaiOptionalDouble,
    pub(crate) median: SaiOptionalDouble,
    pub(crate) maximum: SaiOptionalDouble,
    pub(crate) skewness: SaiOptionalDouble,
    pub(crate) kurtosis: SaiOptionalDouble,
    pub(crate) applied_options: SaiDescriptiveOptions,
    pub(crate) diagnostics: [SaiDiagnostic; SAI_DESCRIPTIVE_DIAGNOSTIC_CAPACITY],
    pub(crate) diagnostic_count: usize,
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

    pub(crate) fn sai_describe(column: *const SaiNumericColumn,
                               options: *const SaiDescriptiveOptions,
                               out_result: *mut SaiDescriptiveResult,
                               out_error: *mut SaiErrorMessage)
                               -> SaiStatus;

    fn sai_error_message_destroy(message: *mut SaiErrorMessage);

    fn sai_engine_version() -> *const c_char;
}

/// エンジンのバージョン。文字列は静的で、解放しない。
pub(crate) fn engine_version() -> &'static str {
    // 呼ぶたびに同じ静的な文字列が返り、内容は ASCII のバージョン番号。
    let text = unsafe { CStr::from_ptr(sai_engine_version()) };
    text.to_str().unwrap_or_default()
}

/// エンジンが書いた診断の対象名を写す。文字列自体はエンジンの静的な領域にあり、
/// 借りたままにするとクレートの外へ生存期間の約束が漏れるので所有する形にする。
pub(crate) fn diagnostic_target(diagnostic: &SaiDiagnostic) -> String {
    if diagnostic.target.is_null() {
        return String::new();
    }
    // 終端は含まれない。エンジンが書くのは snake_case の ASCII キーだけ。
    let bytes = unsafe { slice::from_raw_parts(diagnostic.target.cast::<u8>(), diagnostic.target_length) };
    String::from_utf8_lossy(bytes).into_owned()
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
