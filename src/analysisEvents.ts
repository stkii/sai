import type { AnalysisType } from './analysisRegistry';
import type { AnalysisResult } from './dto';

export interface AnalysisResultPayload {
  id: string;
  type: AnalysisType;
  label: string;
  timestamp: string;
  result: AnalysisResult;
}

export interface AnalysisReadyPayload {
  label: string;
}
