import { useMemo } from 'react';
import { ANALYSIS_METHODS } from '../analysis/registry';
import { getAnalysisItems, getAnalysisMethodByKey } from '../analysis/registry/selectors';
import type { AnalysisModalKey } from '../types';

export const useAnalysisCatalog = () => {
  return useMemo(
    () => ({
      items: getAnalysisItems(),
      methods: ANALYSIS_METHODS,
      getMethodByKey: (key: AnalysisModalKey) => getAnalysisMethodByKey(key),
    }),
    []
  );
};
