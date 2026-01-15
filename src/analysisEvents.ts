import type { ParsedDataTable } from './dto';
import type { AnalysisType } from './runner';

export interface AnalysisResultPayload {
  id: string;
  type: AnalysisType;
  label: string;
  timestamp: string;
  result: ParsedDataTable;
}

export interface AnalysisReadyPayload {
  label: string;
}
