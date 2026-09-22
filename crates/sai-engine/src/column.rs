use std::ffi::c_char;
use std::ptr;

use crate::descriptive::{
    Descriptive,
    DescriptiveOptions,
};
use crate::error::Error;
use crate::ffi;

/// 欠損マスクで「値がある」を表す要素。
pub const MISSING_MASK_PRESENT: u8 = 0;

/// 欠損マスクで「欠損」を表す要素。
pub const MISSING_MASK_MISSING: u8 = 1;

/// 1列ぶんの数値データの借用ビュー。
///
/// 何も所有せず、エンジンは呼び出しの間だけバッファを読む。戻った後にポインターを
/// 保持しないので、列の生存期間は呼び出し元が決めてよい。
#[derive(Debug, Clone, Copy)]
pub struct NumericColumn<'a> {
    values: &'a [f64],
    missing_mask: Option<&'a [u8]>,
    name: Option<&'a str>,
}

impl<'a> NumericColumn<'a> {
    pub fn new(values: &'a [f64]) -> Self {
        Self { values,
               missing_mask: None,
               name: None }
    }

    /// 各要素は [`MISSING_MASK_PRESENT`] か [`MISSING_MASK_MISSING`] で、
    /// 長さは値と揃える。渡さないことが「欠損なし」を意味するので、全要素が
    /// `MISSING_MASK_PRESENT` の配列を用意する必要はない。
    pub fn with_missing_mask(self,
                             missing_mask: &'a [u8])
                             -> Self {
        Self { missing_mask: Some(missing_mask),
               ..self }
    }

    /// エラーメッセージが列を指すのに使う名前。渡さない場合は "the column" になる。
    pub fn with_name(self,
                     name: &'a str)
                     -> Self {
        Self { name: Some(name),
               ..self }
    }

    /// 行数と、欠損として印を付けられていない行数を数える。
    ///
    /// # Errors
    ///
    /// マスクの長さが値と違う、マスクに 0 と 1 以外がある、欠損でない行が有限でない
    /// 値を持つ場合に [`ErrorKind::InvalidArgument`] を返す。
    ///
    /// [`ErrorKind::InvalidArgument`]: crate::ErrorKind::InvalidArgument
    pub fn counts(&self) -> Result<ColumnCounts, Error> {
        let column = self.as_ffi();
        let mut counts = ffi::SaiColumnCounts::default();
        let mut error = ffi::ErrorMessage::empty();

        // 3つの引数はいずれもこのスタックフレームの値で、呼び出しの間だけ生きていれば
        // 足りる。エンジンは戻った後に保持しない。
        let status =
            unsafe { ffi::sai_numeric_column_counts(&raw const column, &raw mut counts, error.as_mut_ptr()) };

        if status == ffi::SAI_STATUS_OK {
            return Ok(ColumnCounts { row_count: counts.row_count,
                                     valid_count: counts.valid_count });
        }
        Err(Error::from_status(status, error.text()))
    }

    /// 平均・標準偏差・最小・中央値・最大と、頼んだ場合の歪度・尖度を求める。
    ///
    /// 空の列、全欠損の列、定数列、件数の足りない列はいずれも正常な入力で、
    /// 返らない値は [`Descriptive::diagnostics`] が理由を持つ。
    ///
    /// # Errors
    ///
    /// [`counts`] と同じ入力契約に反した場合に [`ErrorKind::InvalidArgument`] を返す。
    ///
    /// [`counts`]: Self::counts
    /// [`ErrorKind::InvalidArgument`]: crate::ErrorKind::InvalidArgument
    pub fn describe(&self,
                    options: DescriptiveOptions)
                    -> Result<Descriptive, Error> {
        let column = self.as_ffi();
        let options = options.to_ffi();
        let mut result = ffi::SaiDescriptiveResult::default();
        let mut error = ffi::ErrorMessage::empty();

        let status = unsafe {
            ffi::sai_describe(&raw const column,
                              &raw const options,
                              &raw mut result,
                              error.as_mut_ptr())
        };

        if status == ffi::SAI_STATUS_OK {
            return Ok(Descriptive::from_ffi(&result));
        }
        Err(Error::from_status(status, error.text()))
    }

    /// 借用したままのポインターを詰めるので、戻り値はこの列より長く生きては
    /// ならない。呼び出しの間だけ使う。
    fn as_ffi(&self) -> ffi::SaiNumericColumn {
        let missing_mask = self.missing_mask.unwrap_or_default();
        let name = self.name.unwrap_or_default();
        ffi::SaiNumericColumn { values: borrowed_ptr(self.values),
                                value_count: self.values.len(),
                                missing_mask: borrowed_ptr(missing_mask),
                                missing_mask_count: missing_mask.len(),
                                name: borrowed_ptr(name.as_bytes()).cast::<c_char>(),
                                name_length: name.len() }
    }
}

/// 列を数えた結果。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ColumnCounts {
    /// 欠損かどうかによらない行数。
    pub row_count: usize,

    /// 欠損として印を付けられていない行数。
    pub valid_count: usize,
}

/// 空のスライスの `as_ptr()` はダングリングな非 null を返す。エンジンは null を
/// 「配列がない」と読むので、要素がなければ null を渡して境界の意味を揃える。
fn borrowed_ptr<T>(slice: &[T]) -> *const T {
    if slice.is_empty() {
        ptr::null()
    } else {
        slice.as_ptr()
    }
}
