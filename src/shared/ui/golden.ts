/**
 * 黄金比 (golden ratio) ベースの寸法トークン。
 *
 * UI 全体のプロポーションをここに集約する。マジックナンバーを各所に
 * 散らさず、「なぜその比率か (φ = 1.618…)」をコードに明示するのが目的。
 */

/** 黄金比 φ = (1 + √5) / 2 ≈ 1.618 */
export const PHI = 1.618;

/**
 * 黄金分割の flex 比。主要領域 : 補助領域 = φ : 1。
 * flex-basis 0 の grow 比なので、コンテナ幅が変わっても 61.8% : 38.2% を保つ。
 */
export const GOLDEN_SPLIT = { major: PHI, minor: 1 } as const;

/**
 * フィボナッチ数列に基づくペイン幅 (px)。
 * 隣接項の比 (233 → 377 → 610) はいずれも φ に収束する「黄金の刻み」で、
 * min / default / max の各段がそのまま黄金比のステップになる。
 *
 * headerHeight は左ペイン見出しと中央ペイン Tabs.List の共通高さ。
 * TABLE.rowHeight と同値で、セル 1 マス (65 ≈ 40 × φ) と同じ縦グリッドに乗る。
 */
export const PANE = {
  dataMin: 233,
  dataDefault: 377,
  dataMax: 610,
  ai: 377,
  headerHeight: 40,
} as const;

/**
 * VariablePicker のリスト高さ。max / min = φ になるよう設定し、
 * 縦方向の伸縮も黄金比に揃える (200 × φ ≈ 324)。
 */
export const PICKER_HEIGHT = {
  min: '200px',
  max: '324px',
} as const;

/**
 * 結果テーブルの寸法。
 * - maxWidth: 読み幅の上限。フィボナッチ数列で 610 の次項 (987) を採用し、
 *   PANE (233 / 377 / 610) と地続きの黄金スケールに乗せる。大画面でも間延びしない。
 * - cellMinW / rowHeight: 1 マスの最小フットプリントを width : height = φ に揃え、
 *   セルの形そのものを黄金比にする (65 ≈ 40 × φ)。
 */
export const TABLE = {
  maxWidth: '987px',
  cellMinW: '65px',
  rowHeight: '40px',
} as const;
