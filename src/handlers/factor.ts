import type { AnalysisResultPayload } from '../analysisEvents';
import type { AnalysisHandlerDeps, FactorOptions } from './types';

export const createRunFactor =
  ({ analysisRunner, getSelection, openResultWindow, emitResult, onCloseFactor }: AnalysisHandlerDeps) =>
  async (variables: string[], options: FactorOptions) => {
    const selection = getSelection();
    if (!selection) {
      throw new Error('データが選択されていません');
    }

    const analysis = await analysisRunner.run({
      type: 'factor',
      selection,
      variables,
      options,
    });

    const payload: AnalysisResultPayload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: 'factor',
      label: '因子分析',
      timestamp: analysis.loggedAt,
      result: analysis.result,
    };

    await openResultWindow();
    await emitResult(payload);
    onCloseFactor();
  };
