import type { Dataset, ParsedDataTable } from '../types';

export interface AnalysisOptions {
  [key: string]: unknown;
}

export interface AnalysisResult {
  sections: AnalysisSection[]; // e.g., 記述統計=1件, 因子分析=複数件
}

export interface AnalysisResultPayload {
  id: string;
  type: SupportedAnalysisType;
  label: string;
  timestamp: string;
  options: AnalysisOptions; // 実行時オプションを必ず同梱
  result: AnalysisResult;
}

export interface AnalysisRunRequest {
  selection: Dataset;
  type: SupportedAnalysisType;
  variables: string[];
  options: AnalysisOptions; // モーダル指定値をそのまま保持
}

export interface AnalysisSection {
  key: string; // "eigen" など
  label: string; // 画面表示名
  table: ParsedDataTable;
}

/**
 * Supported analysis types (single source of truth)
 */
export const SUPPORTED_ANALYSIS_TYPES = [
  'correlation',
  'descriptive',
  'factor',
  'regression',
] as const;

export type SupportedAnalysisType = (typeof SUPPORTED_ANALYSIS_TYPES)[number];

const SUPPORTED_ANALYSIS_TYPE_SET: ReadonlySet<string> = new Set(SUPPORTED_ANALYSIS_TYPES);

export const isSupportedAnalysisType = (value: string): value is SupportedAnalysisType => {
  return SUPPORTED_ANALYSIS_TYPE_SET.has(value);
};
