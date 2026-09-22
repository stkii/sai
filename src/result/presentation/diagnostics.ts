import type { ResultDiagnostic } from '../../shared/types';

// エンジンの診断は表示文を持たない。日本語はここだけで組み立てる。
// 対象はエンジンの結果フィールド名 (snake_case) で、値が返らなかった統計量を指す。
const TARGET_LABELS: Record<string, string> = {
  mean: '平均',
  standard_deviation: '標準偏差',
  minimum: '最小値',
  median: '中央値',
  maximum: '最大値',
  skewness: '歪度',
  kurtosis: '尖度',
};

export function labelOfTarget(target: string): string {
  return TARGET_LABELS[target] ?? target;
}

/**
 * 値が返らなかった理由の 1 文。知らないコードを既知の理由へ寄せると、
 * 実際とは違う説明を見せることになるのでコードをそのまま添える。
 */
export function sentenceOfDiagnostic(diagnostic: ResultDiagnostic): string {
  const label = labelOfTarget(diagnostic.target);
  switch (diagnostic.code) {
    case 'insufficient_observations':
      return `${label}: 有効な値が ${diagnostic.count} 件で、この統計量の定義に足りません`;
    case 'variance_too_small':
      return `${label}: 値のばらつきが小さすぎて求められません (有効 ${diagnostic.count} 件)`;
    case 'not_representable':
      return `${label}: 値が計算機の表せる範囲を超えるため求められません (有効 ${diagnostic.count} 件)`;
    default:
      return `${label}: 求められませんでした (診断コード: ${diagnostic.code})`;
  }
}
