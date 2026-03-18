import type { Dataset, ParsedDataTable } from '../types';

export interface AnalysisOptions {
  [key: string]: unknown;
}

export interface AnalysisResult {
  sections: AnalysisSection[]; // e.g., 記述統計=1件, 因子分析=複数件
}

export interface AnalysisLogSummary {
  id: string;
  type: SupportedAnalysisType;
  timestamp: string;
  dataset: Dataset;
}

export interface AnalysisResultPayload {
  schemaVersion: number;
  id: string;
  type: SupportedAnalysisType;
  timestamp: string;
  dataset: Dataset;
  variables: string[];
  options: AnalysisOptions; // 実行時オプションを必ず同梱
  result: AnalysisResult;
  n?: number;
  nNote?: string;
}

export type DatasetKind = 'numeric' | 'string_mixed';

export interface AnalysisRunRequest {
  selection: Dataset;
  type: SupportedAnalysisType;
  variables: string[];
  options: AnalysisOptions; // モーダル指定値をそのまま保持
  datasetKind?: DatasetKind; // 省略時は 'numeric'
}

export interface AnalysisSection {
  key: string; // "eigen" など
  label: string; // 画面表示名
  table: ParsedDataTable;
  image?: string; // base64 data URL (e.g. scree plot)
}

/**
 * Supported analysis types (single source of truth)
 */
export const SUPPORTED_ANALYSIS_TYPES = [
  'anova',
  'correlation',
  'descriptive',
  'factor',
  'regression',
  'reliability',
] as const;

export type SupportedAnalysisType = (typeof SUPPORTED_ANALYSIS_TYPES)[number];

const SUPPORTED_ANALYSIS_TYPE_SET: ReadonlySet<string> = new Set(SUPPORTED_ANALYSIS_TYPES);

export const isSupportedAnalysisType = (value: string): value is SupportedAnalysisType => {
  return SUPPORTED_ANALYSIS_TYPE_SET.has(value);
};
