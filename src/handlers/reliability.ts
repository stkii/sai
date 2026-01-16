import type { AnalysisResultPayload } from '../analysisEvents';
import type { AnalysisHandlerDeps, ReliabilityOptions } from './types';

export const createRunReliability =
  ({ analysisRunner, getSelection, openResultWindow, emitResult, onCloseReliability }: AnalysisHandlerDeps) =>
  async (variables: string[], options: ReliabilityOptions) => {
    const selection = getSelection();
    if (!selection) {
      throw new Error('データが選択されていません');
    }

    const analysis = await analysisRunner.run({
      type: 'reliability',
      selection,
      variables,
      options,
    });

    const payload: AnalysisResultPayload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: 'reliability',
      label: '信頼性分析',
      timestamp: analysis.loggedAt,
      result: analysis.result,
    };

    await openResultWindow();
    await emitResult(payload);
    onCloseReliability();
  };
