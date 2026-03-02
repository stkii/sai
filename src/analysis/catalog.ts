import type { SupportedAnalysisType } from '../types';
import type { AnalysisMethodModule } from './core/analysisMethodContracts';
import correlationMethod from './methods/correlation';
import descriptiveMethod from './methods/descriptive';
import {
  buildAnalysisMethodMap,
  getAnalysisItems,
  getAnalysisLabelByKey,
  getAnalysisMethodByKey,
} from './registry/selectors';

const methods = [descriptiveMethod, correlationMethod] as const satisfies readonly AnalysisMethodModule[];
const methodMap = buildAnalysisMethodMap(methods);
const items = getAnalysisItems(methods);

const getMethodByKey = (key: SupportedAnalysisType) => {
  return getAnalysisMethodByKey(methodMap, key);
};

const getLabelByKey = (key: SupportedAnalysisType) => {
  return getAnalysisLabelByKey(methodMap, key);
};

export const analysisCatalog = {
  items,
  methods,
  getMethodByKey,
  getLabelByKey,
};
