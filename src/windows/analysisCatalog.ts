import type { AnalysisMethodModule } from '../analysis/core/analysisMethodContracts';
import correlationMethod from '../analysis/methods/correlation';
import descriptiveMethod from '../analysis/methods/descriptive';
import {
  buildAnalysisMethodMap,
  getAnalysisItems,
  getAnalysisLabelByKey,
  getAnalysisMethodByKey,
} from '../analysis/registry/selectors';
import type { SupportedAnalysisType } from '../types';

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
