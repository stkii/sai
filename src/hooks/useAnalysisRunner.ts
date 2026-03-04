import { useMemo } from 'react';
import { createAnalysisRunner } from '../analysis/api';
import tauriIpc from '../tauriIpc';

export const useAnalysisRunner = () => {
  return useMemo(
    () =>
      createAnalysisRunner({
        buildNumericDataset: (selection, variables) =>
          tauriIpc.buildNumericDataset(selection.path, selection.sheet, variables),
        runAnalysis: (type, datasetCacheId, options) => tauriIpc.runAnalysis(type, datasetCacheId, options),
      }),
    []
  );
};
