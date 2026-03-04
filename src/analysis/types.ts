import type { ParsedDataTable } from '../types';

/* ===== CORRELATION ===== */
export type CorrelationMethod = 'pearson' | 'kendall' | 'spearman';
export type CorrelationAlternative = 'two.sided' | 'less' | 'greater';
export type CorrelationMissingValueUse = 'complete.obs' | 'pairwise.complete.obs' | 'mean_imp';

export interface CorrelationOptions extends AnalysisOptions {
  method: CorrelationMethod;
  alternative: CorrelationAlternative;
  use: CorrelationMissingValueUse;
}

/* ===== DESCRIPTIVE ===== */
export type DescriptiveOrder = 'default' | 'mean_asc' | 'mean_desc';

export interface DescriptiveOptions extends AnalysisOptions {
  order: DescriptiveOrder;
}

/* ===== FACTOR ===== */
export interface FactorOptions extends AnalysisOptions {
  extraction: 'ml';
  rotation: 'none' | 'varimax' | 'promax';
  sort: boolean;
}

export interface FactorResult {
  eigen: ParsedDataTable;
  pattern: ParsedDataTable;
  rotmat: ParsedDataTable;
  structure?: ParsedDataTable;
  phi?: ParsedDataTable;
}

/* ===== ANALYSIS ===== */
export interface AnalysisOptions {
  [key: string]: unknown;
}

export type AnalysisResult = AnalysisTableResult | AnalysisRegressionResult | AnalysisFactorResult;

/**
 * Supported analysis types (single source of truth)
 */
export type SupportedAnalysisType = 'correlation' | 'descriptive' | 'factor';

export interface RegressionResult {
  model_summary: ParsedDataTable;
  coefficients: ParsedDataTable;
  anova: ParsedDataTable;
}

export interface AnalysisRunResult {
  result: AnalysisResult;
  loggedAt: string;
  analysisId: string;
}

export interface AnalysisResultPayload {
  id: string;
  type: SupportedAnalysisType;
  label: string;
  timestamp: string;
  result: AnalysisResult;
}

export interface AnalysisReadyPayload {
  label: string;
}

export interface AnalysisExportSection {
  sectionTitle?: string;
  table: ParsedDataTable;
}

export interface AnalysisExportLog {
  label: string;
  timestamp: string;
  sections: AnalysisExportSection[];
}

export interface AnalysisLogSummary {
  analysisId: string;
  timestamp: string;
  analysisType: string;
  filePath: string;
  sheetName: string;
  variables: string[];
}

export interface AnalysisLogEntry extends AnalysisLogSummary {
  options: AnalysisOptions;
  result: AnalysisResult;
}

interface AnalysisFactorResult {
  kind: 'factor';
  factor: FactorResult;
}

interface AnalysisTableResult {
  kind: 'table';
  table: ParsedDataTable;
}

interface AnalysisRegressionResult {
  kind: 'regression';
  regression: RegressionResult;
}
