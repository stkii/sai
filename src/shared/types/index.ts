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
  title: string;
  table: AnalysisTable;
}

export interface AnalysisResult {
  sections: AnalysisSection[];
  n?: number;
  nNote?: string;
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

export interface HistoryRecord {
  id: string;
  method: Method;
  variables: string[];
  options: AnalysisOptions;
  result: AnalysisResult;
  createdAt: number;
}
