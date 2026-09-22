// 機能フォルダ間・IPC レイヤーで共有される型はここに集約する。
// 機能内部だけで完結する型は `<feature>/types.ts` を使う。

export type Method =
  | 'describe'
  | 'correlation'
  | 'regression'
  | 'reliability'
  | 'factor'
  | 'anova'
  | 'distance'
  | 'mds'
  | 'power';

export type AnalysisOptions = Record<string, unknown>;

export interface AnalysisTable {
  headers: string[];
  rows: string[][];
  note?: string;
}

export interface AnalysisSection {
  /**
   * メソッド固有の表示 (renderResult) が節を特定するための鍵。
   * 表示名 (title) と違い変わらない。必要なメソッドだけが付けるため任意。
   */
  id?: string;
  title: string;
  table: AnalysisTable;
}

export interface AnalysisResult {
  /** 整形済みの表。C++ エンジンの経路では空で、代わりに typed を持つ。 */
  sections: AnalysisSection[];
  n?: number;
  nNote?: string;
  /** 丸める前の値と診断。R の経路と、これが無かった頃の履歴には付かない。 */
  typed?: TypedResult;
  /** 計算した実装。 */
  engine?: EngineIdentity;
}

/** 結果を計算した実装。保存済みの結果を今のエンジンの出力と区別するために使う。 */
export interface EngineIdentity {
  name: string;
  /** 版を特定できない実行先では付かない。 */
  version?: string;
}

// 手法ごとに形が違うため union。method で判別する。
export type TypedResult = DescriptiveReport;

/** 頼んだ値が返らなかった理由。表示文はこれと target から画面が組み立てる。 */
export interface ResultDiagnostic {
  code: string;
  /** 空のままだった結果のフィールド名。 */
  target: string;
  /** その統計量を求めるのに使えた有効件数。 */
  count: number;
}

export interface DescriptiveReport {
  method: 'describe';
  columns: DescriptiveColumn[];
  appliedOptions: DescriptiveAppliedOptions;
}

/** エンジンが実際に適用した設定。要求した設定は履歴の options に残る。 */
export interface DescriptiveAppliedOptions {
  sort: string;
  includeSkewness: boolean;
  includeKurtosis: boolean;
}

/**
 * 1 変数ぶんの記述統計。null は「値がない」ことで 0 の代わりではない。
 * オプションで切った統計量を除き、null には必ず対応する診断が付く。
 */
export interface DescriptiveColumn {
  variable: string;
  totalCount: number;
  validCount: number;
  missingCount: number;
  mean: number | null;
  standardDeviation: number | null;
  minimum: number | null;
  median: number | null;
  maximum: number | null;
  skewness: number | null;
  kurtosis: number | null;
  diagnostics: ResultDiagnostic[];
}

/** 読み込み済みデータセットの全体。プレビュー表示のため全行を含む。 */
export interface LoadedDataset {
  key: string;
  headers: string[];
  rows: string[][];
}

/**
 * 変数作成の指定。現在は逆転項目のみ。
 * names は sources と同じ並びの新しい列名。接尾辞から組み立てるか直接入力するかは
 * モーダル側の選択で、Rust へは確定した名前だけを渡す。
 */
export interface VariableSpec {
  sources: string[];
  names: string[];
  scaleMin: number;
  scaleMax: number;
}

/** 変数作成の結果。note は数値化に失敗した値の通知。 */
export interface CreateVariableResult {
  dataset: LoadedDataset;
  note?: string;
}

/** 履歴の読込結果。skipped は壊れて読めなかった記録の件数。 */
export interface HistoryLoadResult {
  records: HistoryRecord[];
  skipped: number;
}

export interface HistoryRecord {
  /** 保存された行の形式。付かない記録は型付き結果より前に保存されたもの。 */
  formatVersion?: number;
  id: string;
  method: Method;
  variables: string[];
  options: AnalysisOptions;
  result: AnalysisResult;
  createdAt: number;
}
