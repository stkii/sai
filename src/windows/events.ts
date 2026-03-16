export interface AnalysisReadyPayload {
  label: string;
}

export const ANALYSIS_READY_EVENT = 'analysis:ready';
export const ANALYSIS_RESULT_EVENT = 'analysis:result';

export const DATA_WINDOW_LABEL = 'dataView';
export const RESULT_WINDOW_LABEL = 'resultView';
export const HISTORY_WINDOW_LABEL = 'historyView';
