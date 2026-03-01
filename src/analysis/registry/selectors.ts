import type { SupportedAnalysisType } from '../../types';
import { ANALYSIS_METHODS } from './index';
import type { AnalysisMethodModule } from './types';

const ANALYSIS_METHOD_MAP = new Map<SupportedAnalysisType, AnalysisMethodModule>(
  ANALYSIS_METHODS.map((method) => [method.definition.key, method])
);

export const getAnalysisItems = () => {
  return ANALYSIS_METHODS.map((method) => ({
    label: method.definition.label,
    value: method.definition.key,
  }));
};

export const getAnalysisMethodByKey = (key: SupportedAnalysisType): AnalysisMethodModule | null => {
  return ANALYSIS_METHOD_MAP.get(key) ?? null;
};

export const getAnalysisLabelByKey = (key: SupportedAnalysisType): string => {
  return ANALYSIS_METHOD_MAP.get(key)?.definition.label ?? key;
};
