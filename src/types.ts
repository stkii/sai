export type ParsedTableCell = string | number | boolean | null;

export interface ParsedDataTable {
  headers: string[];
  rows: ParsedTableCell[][];
  note?: string;
  title?: string;
}

export interface ImportDataset {
  path: string;
  sheet?: string;
}

export interface AnalysisOptions {
  [key: string]: unknown;
}

export interface RegressionResult {
  model_summary: ParsedDataTable;
  coefficients: ParsedDataTable;
  anova: ParsedDataTable;
}

export interface FactorResult {
  eigen: ParsedDataTable;
  pattern: ParsedDataTable;
  rotmat: ParsedDataTable;
  structure?: ParsedDataTable;
  phi?: ParsedDataTable;
}

export interface AnalysisTableResult {
  kind: 'table';
  table: ParsedDataTable;
}

export interface AnalysisRegressionResult {
  kind: 'regression';
  regression: RegressionResult;
}

export interface AnalysisFactorResult {
  kind: 'factor';
  factor: FactorResult;
}

export type AnalysisResult = AnalysisTableResult | AnalysisRegressionResult | AnalysisFactorResult;

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

export interface CorrelationOptions extends AnalysisOptions {
  method: CorrelationMethod;
  alternative: CorrelationAlternative;
  use: CorrelationMissingValueUse;
}

export interface DescriptiveOptions extends AnalysisOptions {
  order: DescriptiveOrder;
}

export type SupportedAnalysisType = 'correlation' | 'descriptive' | 'factor';
export type DescriptiveOrder = 'default' | 'mean_asc' | 'mean_desc';
export type CorrelationMethod = 'pearson' | 'kendall' | 'spearman';
export type CorrelationAlternative = 'two.sided' | 'less' | 'greater';
export type CorrelationMissingValueUse = 'complete.obs' | 'pairwise.complete.obs' | 'mean_imp';

export interface AnalysisModalProps<TOptions = void> {
  open: boolean;
  onClose: () => void;
  variables: string[];
  onExecute?: (variables: string[], options: TOptions) => Promise<void>;
}
