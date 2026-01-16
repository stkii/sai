import type { AnalysisResult } from './dto';
import type { AnalysisType } from './runner';

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
