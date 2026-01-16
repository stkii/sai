import type { AnalysisResultPayload } from '../analysisEvents';
import type { AnalysisHandlerDeps, CorrelationOptions } from './types';

export const createRunCorrelation =
  ({ analysisRunner, getSelection, openResultWindow, emitResult, onCloseCorrelation }: AnalysisHandlerDeps) =>
  async (variables: string[], options: CorrelationOptions) => {
    const selection = getSelection();
    if (!selection) {
      throw new Error('データが選択されていません');
    }

    const analysis = await analysisRunner.run({
      type: 'correlation',
      selection,
      variables,
      options,
    });

    const payload: AnalysisResultPayload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: 'correlation',
      label: '相関',
      timestamp: analysis.loggedAt,
      result: analysis.result,
    };

    await openResultWindow();
    await emitResult(payload);
    onCloseCorrelation();
  };
