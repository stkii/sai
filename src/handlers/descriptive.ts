import { runAnalysisWithOptions } from './runAnalysisHandler';
import type { AnalysisHandlerDeps } from './types';

export const createRunDescriptive =
  (deps: AnalysisHandlerDeps) => async (variables: string[], order: string) => {
    await runAnalysisWithOptions(
      deps,
      { type: 'descriptive', label: '記述統計', onClose: deps.onCloseDescriptive },
      variables,
      { order }
    );
  };
