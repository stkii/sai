import type { AnalysisResultPayload } from '../analysisEvents';
import type { AnalysisHandlerDeps } from './types';

export const createRunDescriptive =
  ({ analysisRunner, getSelection, openResultWindow, emitResult, onCloseDescriptive }: AnalysisHandlerDeps) =>
  async (variables: string[], order: string) => {
    const selection = getSelection();
    if (!selection) {
      throw new Error('データが選択されていません');
    }

    const analysis = await analysisRunner.run({
      type: 'descriptive',
      selection,
      variables,
      options: { order },
    });

    const payload: AnalysisResultPayload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: 'descriptive',
      label: '記述統計',
      timestamp: analysis.loggedAt,
      result: analysis.result,
    };

    await openResultWindow();
    await emitResult(payload);
    onCloseDescriptive();
  };
