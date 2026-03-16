import type { SupportedAnalysisType } from '../analysis/api';

export const PERSISTENT_LOG_LIMIT = 50;
export const ALL_ANALYSIS_FILTER = 'all';

export type LogSource = 'session' | 'persistent';
export type AnalysisFilter = SupportedAnalysisType | typeof ALL_ANALYSIS_FILTER;

export interface SelectedIdsBySource {
  session: string | null;
  persistent: string | null;
}

export const LOG_SOURCE_LABEL: Record<LogSource, string> = {
  session: 'このセッション',
  persistent: '過去の分析',
};

export interface AnalysisLogEmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface AnalysisLogBrowserOptions {
  availableSources?: readonly LogSource[];
  defaultSource?: LogSource;
  emptyStateAction?: AnalysisLogEmptyStateAction | null;
  listenForLiveResults?: boolean;
  readyLabel?: string | null;
  title?: string;
}
