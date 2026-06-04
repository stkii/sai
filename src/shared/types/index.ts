// 機能フォルダ間・IPC レイヤーで共有される型はここに集約する。
// 機能内部だけで完結する型は `<feature>/types.ts` を使う。

export type Method =
  | 'describe'
  | 'correlation'
  | 'regression'
  | 'reliability'
  | 'factor'
  | 'anova'
  | 'power';

export type DatasetKind = 'numeric' | 'mixed';

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

export interface DatasetSummary {
  key: string;
  headers: string[];
  rowCount: number;
  preview: string[][];
}

export interface HistoryRecord {
  id: string;
  method: Method;
  variables: string[];
  options: AnalysisOptions;
  result: AnalysisResult;
  createdAt: number;
}
