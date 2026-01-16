import type { AnalysisResultPayload } from '../analysisEvents';
import type { AnalysisOptions, AnalysisRunner } from '../runner';

export interface AnalysisHandlerDeps {
  analysisRunner: AnalysisRunner;
  getSelection: () => { path: string; sheet: string } | null;
  openResultWindow: () => Promise<void>;
  emitResult: (payload: AnalysisResultPayload) => Promise<void>;
  onCloseDescriptive: () => void;
  onCloseCorrelation: () => void;
  onCloseRegression: () => void;
  onCloseReliability: () => void;
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
