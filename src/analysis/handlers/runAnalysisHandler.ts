import type { AnalysisResultPayload } from '../analysisEvents';
import { type AnalysisType, getAnalysisLabel } from '../analysisRegistry';
import type { AnalysisOptions } from '../runner';
import type { AnalysisHandlerDeps } from './types';

interface RunAnalysisConfig {
  type: AnalysisType;
  onClose: () => void;
}

type RunAnalysisDeps = Pick<
  AnalysisHandlerDeps,
  'analysisRunner' | 'getSelection' | 'openResultWindow' | 'emitResult'
>;

export const runAnalysisWithOptions = async <TOptions extends AnalysisOptions>(
  deps: RunAnalysisDeps,
  config: RunAnalysisConfig,
  variables: string[],
  options: TOptions
): Promise<void> => {
  const selection = deps.getSelection();
  if (!selection) {
    throw new Error('データが選択されていません');
  }

  const analysis = await deps.analysisRunner.run({
    type: config.type,
    selection,
    variables,
    options,
  });

  const payload: AnalysisResultPayload = {
    id: analysis.analysisId,
    type: config.type,
    label: getAnalysisLabel(config.type),
    timestamp: analysis.loggedAt,
    result: analysis.result,
  };

  await deps.openResultWindow();
  await deps.emitResult(payload);
  config.onClose();
};
