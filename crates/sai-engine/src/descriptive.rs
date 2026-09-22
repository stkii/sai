use crate::ffi;

/// 歪度と尖度を求めるかどうか。2つは独立で、片方を頼んでももう片方は計算しない。
/// 既定はどちらも求めない。
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct DescriptiveOptions {
    pub include_skewness: bool,
    pub include_kurtosis: bool,
}

/// 頼んだ値が返らなかった理由。手法ごとに分けず全手法で共通のコードを使う。
///
/// 網羅できる列挙にしてある。区分が増えたときに表示文を足し忘れると、利用側が
/// コンパイルで気付く。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DiagnosticCode {
    /// その統計量の定義に必要な有効件数に届かない。
    InsufficientObservations,
    /// 分散が小さすぎて形状の統計量を標準偏差で割れない。
    VarianceTooSmall,
    /// 定義上は存在するが double では表せない。
    NotRepresentable,
    /// このクレートより新しいエンジンが増やした区分。既知のどれかへ寄せると
    /// 返らなかった理由が別のものにすり替わるので、値のまま持つ。
    Unrecognized(i32),
}

impl DiagnosticCode {
    fn from_code(code: i32) -> Self {
        match code {
            1 => Self::InsufficientObservations,
            2 => Self::VarianceTooSmall,
            3 => Self::NotRepresentable,
            other => Self::Unrecognized(other),
        }
    }
}

/// 値が1つ返らなかったことと、その理由。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Diagnostic {
    pub code: DiagnosticCode,
    /// 空のままだった [`Descriptive`] のフィールド名。表示文ではないので、
    /// 画面に出す文はこれとコードから組み立てる。
    pub target: String,
    /// その統計量を求めるのに使えた有効件数。
    pub count: usize,
}

/// 数値1列の記述統計。
///
/// 値がないことは `None` で表し、0 や NaN で代用しない。オプションで切った統計量
/// 以外の `None` には必ず対応する診断が付くので、`diagnostics` が空であることは
/// 「頼んだ値がすべて返った」ことを意味する。
#[derive(Debug, Clone, PartialEq)]
pub struct Descriptive {
    /// `valid_count` と `missing_count` の和。
    pub total_count: usize,
    pub valid_count: usize,
    pub missing_count: usize,

    pub mean: Option<f64>,
    /// 標本標準偏差 (分母は n - 1)。
    pub standard_deviation: Option<f64>,
    pub minimum: Option<f64>,
    pub median: Option<f64>,
    pub maximum: Option<f64>,
    /// いずれも偏りを補正した値で、尖度は正規分布が 0 になる超過尖度。
    pub skewness: Option<f64>,
    pub kurtosis: Option<f64>,

    /// エンジンが実際に適用した設定。
    pub applied_options: DescriptiveOptions,
    pub diagnostics: Vec<Diagnostic>,
}

impl DescriptiveOptions {
    pub(crate) fn to_ffi(self) -> ffi::SaiDescriptiveOptions {
        ffi::SaiDescriptiveOptions { include_skewness: u8::from(self.include_skewness),
                                     include_kurtosis: u8::from(self.include_kurtosis) }
    }

    fn from_ffi(options: ffi::SaiDescriptiveOptions) -> Self {
        Self { include_skewness: options.include_skewness != 0,
               include_kurtosis: options.include_kurtosis != 0 }
    }
}

impl Descriptive {
    pub(crate) fn from_ffi(result: &ffi::SaiDescriptiveResult) -> Self {
        // エンジンは容量を超える件数を書かないが、ここで切っておけば境界の
        // 取り決めが破れても未初期化の要素を読むことはない。
        let written = result.diagnostic_count.min(result.diagnostics.len());
        let diagnostics =
            result.diagnostics[..written].iter()
                                         .map(|d| Diagnostic { code: DiagnosticCode::from_code(d.code),
                                                               target: ffi::diagnostic_target(d),
                                                               count: d.count })
                                         .collect();

        Self { total_count: result.total_count,
               valid_count: result.valid_count,
               missing_count: result.missing_count,
               mean: optional(result.mean),
               standard_deviation: optional(result.standard_deviation),
               minimum: optional(result.minimum),
               median: optional(result.median),
               maximum: optional(result.maximum),
               skewness: optional(result.skewness),
               kurtosis: optional(result.kurtosis),
               applied_options: DescriptiveOptions::from_ffi(result.applied_options),
               diagnostics }
    }
}

/// `present` が 0 のとき `value` は結果ではないので読まない。
fn optional(value: ffi::SaiOptionalDouble) -> Option<f64> {
    if value.present == 0 {
        None
    } else {
        Some(value.value)
    }
}
