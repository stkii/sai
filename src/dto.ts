/**
 * Data Transfer Object shared with the Rust side.
 *
 * セル値の特別表現（表示層の解釈ルール）
 * - "NaN!": 数値NaNをExcel由来で検出した場合の表記（文字列）。表示はそのまま。
 * - "Inf!" / "-Inf!": 正または負の無限大。表示はそのまま。
 * - Excelエラー記号: "#DIV/0!", "#N/A", "#NAME?", "#NULL!", "#NUM!", "#REF!", "#VALUE!", "#GETTING"。表示はそのまま。
 * - 相関分析 p 値の対角成分: "-"（未定義の意味）。表示はそのまま。
 * - その他の未定義/欠損: null
 *
 * 注: これらは表示向けの文字列であり、機械処理時は型や意味に応じた分岐が必要です。
 */

export type ParsedTable = {
  headers: string[];
  rows: CellValue[][];
};

type CellValue = string | number | boolean | null | undefined;
