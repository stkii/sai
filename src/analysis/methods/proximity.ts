/**
 * 距離 (distance) と多次元尺度構成法 (mds) が共有する近接度の選択肢。
 *
 * R 側も `mds.R` が `distance.R` の `.DistanceMatrix` を共用しており、
 * 測度の一覧が両メソッドでずれないよう定義を 1 箇所に置く。
 */

import type { Choice } from '../../shared/ui/fields';

export type ProximityMeasure =
  | 'euclid'
  | 'seuclid'
  | 'chebychev'
  | 'block'
  | 'minkowski'
  | 'correlation'
  | 'cosine';

/** 距離の計算対象。行 (ケース) と列 (変数) のどちらをオブジェクトとみなすか */
export type ProximityBetween = 'variables' | 'cases';

export const MEASURE_OPTIONS: Choice<ProximityMeasure>[] = [
  { value: 'euclid', label: 'ユークリッド距離' },
  { value: 'seuclid', label: '平方ユークリッド距離' },
  { value: 'chebychev', label: 'Chebychev' },
  { value: 'block', label: 'ブロック (市街地距離)' },
  { value: 'minkowski', label: 'Minkowski' },
  { value: 'correlation', label: 'Pearson 相関 (類似度)' },
  { value: 'cosine', label: 'コサイン (類似度)' },
];

export const BETWEEN_OPTIONS: Choice<ProximityBetween>[] = [
  { value: 'variables', label: '変数間' },
  { value: 'cases', label: 'ケース間' },
];
