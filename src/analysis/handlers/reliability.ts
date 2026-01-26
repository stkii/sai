import { runAnalysisWithOptions } from './runAnalysisHandler';
import type { AnalysisHandlerDeps, ReliabilityOptions } from './types';

export const createRunReliability =
  (deps: AnalysisHandlerDeps) => async (variables: string[], options: ReliabilityOptions) => {
    await runAnalysisWithOptions(
      deps,
      { type: 'reliability', onClose: deps.onCloseReliability },
      variables,
      options
    );
  };
