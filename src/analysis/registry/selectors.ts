import type { SupportedAnalysisType } from '../../types';
import type { AnalysisMethodModule } from '../core/analysisMethodContracts';

export type AnalysisMethodMap = Map<SupportedAnalysisType, AnalysisMethodModule>;

export const buildAnalysisMethodMap = (methods: readonly AnalysisMethodModule[]): AnalysisMethodMap => {
  return new Map(methods.map((method) => [method.definition.key, method]));
};

export const getAnalysisItems = (methods: readonly AnalysisMethodModule[]) => {
  return methods.map((method) => ({
    label: method.definition.label,
    value: method.definition.key,
  }));
};

export const getAnalysisMethodByKey = (
  methodMap: AnalysisMethodMap,
  key: SupportedAnalysisType
): AnalysisMethodModule | null => {
  return methodMap.get(key) ?? null;
};

export const getAnalysisLabelByKey = (methodMap: AnalysisMethodMap, key: SupportedAnalysisType): string => {
  return methodMap.get(key)?.definition.label ?? key;
};
