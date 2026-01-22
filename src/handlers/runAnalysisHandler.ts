import type { AnalysisResultPayload } from '../analysisEvents';
import type { AnalysisOptions, AnalysisType } from '../runner';
import type { AnalysisHandlerDeps } from './types';

interface RunAnalysisConfig {
  type: AnalysisType;
  label: string;
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
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: config.type,
    label: config.label,
    timestamp: analysis.loggedAt,
    result: analysis.result,
  };

  await deps.openResultWindow();
  await deps.emitResult(payload);
  config.onClose();
};
