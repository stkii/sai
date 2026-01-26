import type { AnalysisResultPayload } from '../analysisEvents';
import type { AnalysisOptions, AnalysisRunner } from '../runner';

export interface AnalysisHandlerDeps {
  analysisRunner: AnalysisRunner;
  getSelection: () => { path: string; sheet?: string } | null;
  openResultWindow: () => Promise<void>;
  emitResult: (payload: AnalysisResultPayload) => Promise<void>;
  onCloseDescriptive: () => void;
  onCloseCorrelation: () => void;
  onCloseRegression: () => void;
  onCloseReliability: () => void;
  onCloseFactor: () => void;
  onClosePower: () => void;
}

export interface CorrelationOptions extends AnalysisOptions {
  method: string;
  alternative: string;
  use: string;
}

export interface RegressionOptions extends AnalysisOptions {
  dependent: string;
  independent: string[];
  interactions?: string[] | 'auto';
  center?: boolean;
}

export interface ReliabilityOptions extends AnalysisOptions {
  model: string;
}

export interface FactorOptions extends AnalysisOptions {
  method: string;
  n_factors_auto: boolean;
  n_factors?: number;
  rotation: string;
  corr_use: string;
  power?: number;
  sort_loadings: boolean;
}

export interface PowerTestOptions extends AnalysisOptions {
  test: string;
  effect: string;
  sig_level: number;
  power: number;
  t_type?: string;
  alternative?: string;
  k?: number;
  df?: number;
  u?: number;
}
