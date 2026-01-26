import { runAnalysisWithOptions } from './runAnalysisHandler';
import type { AnalysisHandlerDeps, CorrelationOptions } from './types';

export const createRunCorrelation =
  (deps: AnalysisHandlerDeps) => async (variables: string[], options: CorrelationOptions) => {
    await runAnalysisWithOptions(
      deps,
      { type: 'correlation', onClose: deps.onCloseCorrelation },
      variables,
      options
    );
  };
