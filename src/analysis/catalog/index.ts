import type { SupportedAnalysisType } from '../types';
import { ANALYSIS_METHODS } from './methods';
import {
  buildAnalysisMethodMap,
  getAnalysisItems,
  getAnalysisLabelByKey,
  getAnalysisMethodByKey,
} from './selectors';

const methodMap = buildAnalysisMethodMap(ANALYSIS_METHODS);
const items = getAnalysisItems(ANALYSIS_METHODS);

const getMethodByKey = (key: SupportedAnalysisType) => {
  return getAnalysisMethodByKey(methodMap, key);
};

const getLabelByKey = (key: SupportedAnalysisType) => {
  return getAnalysisLabelByKey(methodMap, key);
};

export const analysisCatalog = {
  items,
  methods: ANALYSIS_METHODS,
  getMethodByKey,
  getLabelByKey,
};
