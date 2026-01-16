import type { AnalysisResultPayload } from '../analysisEvents';
import type { AnalysisHandlerDeps, RegressionOptions } from './types';

export const createRunRegression =
  ({ analysisRunner, getSelection, openResultWindow, emitResult, onCloseRegression }: AnalysisHandlerDeps) =>
  async (variables: string[], options: RegressionOptions) => {
    const selection = getSelection();
    if (!selection) {
      throw new Error('データが選択されていません');
    }

    const analysis = await analysisRunner.run({
      type: 'regression',
      selection,
      variables,
      options,
    });

    const payload: AnalysisResultPayload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: 'regression',
      label: '回帰分析',
      timestamp: analysis.loggedAt,
      result: analysis.result,
    };

    await openResultWindow();
    await emitResult(payload);
    onCloseRegression();
  };
