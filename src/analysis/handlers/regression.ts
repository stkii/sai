import { runAnalysisWithOptions } from './runAnalysisHandler';
import type { AnalysisHandlerDeps, RegressionOptions } from './types';

export const createRunRegression =
  (deps: AnalysisHandlerDeps) => async (variables: string[], options: RegressionOptions) => {
    await runAnalysisWithOptions(
      deps,
      { type: 'regression', onClose: deps.onCloseRegression },
      variables,
      options
    );
  };
