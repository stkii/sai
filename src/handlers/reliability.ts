import { runAnalysisWithOptions } from './runAnalysisHandler';
import type { AnalysisHandlerDeps, ReliabilityOptions } from './types';

export const createRunReliability =
  (deps: AnalysisHandlerDeps) => async (variables: string[], options: ReliabilityOptions) => {
    await runAnalysisWithOptions(
      deps,
      { type: 'reliability', label: '信頼性分析', onClose: deps.onCloseReliability },
      variables,
      options
    );
  };
