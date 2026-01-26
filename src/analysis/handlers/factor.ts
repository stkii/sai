import { runAnalysisWithOptions } from './runAnalysisHandler';
import type { AnalysisHandlerDeps, FactorOptions } from './types';

export const createRunFactor =
  (deps: AnalysisHandlerDeps) => async (variables: string[], options: FactorOptions) => {
    await runAnalysisWithOptions(deps, { type: 'factor', onClose: deps.onCloseFactor }, variables, options);
  };
