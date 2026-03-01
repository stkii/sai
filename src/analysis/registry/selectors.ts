import type { AnalysisModalKey } from '../../types';
import { ANALYSIS_METHODS } from './index';
import type { AnalysisMethodModule } from './types';

const ANALYSIS_METHOD_MAP = new Map<AnalysisModalKey, AnalysisMethodModule>(
  ANALYSIS_METHODS.map((method) => [method.definition.key, method])
);

export const ANALYSIS_MODAL_KEYS: AnalysisModalKey[] = ANALYSIS_METHODS.map(
  (method) => method.definition.key
) as AnalysisModalKey[];

export const getAnalysisItems = () => {
  return ANALYSIS_METHODS.map((method) => ({
    label: method.definition.label,
    value: method.definition.key,
  }));
};

export const getAnalysisMethodByKey = (key: AnalysisModalKey): AnalysisMethodModule | null => {
  return ANALYSIS_METHOD_MAP.get(key) ?? null;
};

export const getAnalysisLabelByKey = (key: AnalysisModalKey): string => {
  return ANALYSIS_METHOD_MAP.get(key)?.definition.label ?? key;
};

export const isAnalysisModalKey = (value: string): value is AnalysisModalKey => {
  return ANALYSIS_METHOD_MAP.has(value as AnalysisModalKey);
};
