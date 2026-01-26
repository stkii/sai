import { runAnalysisWithOptions } from './runAnalysisHandler';
import type { AnalysisHandlerDeps } from './types';

export const createRunDescriptive =
  (deps: AnalysisHandlerDeps) => async (variables: string[], order: string) => {
    await runAnalysisWithOptions(deps, { type: 'descriptive', onClose: deps.onCloseDescriptive }, variables, {
      order,
    });
  };
