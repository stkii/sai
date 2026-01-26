import type { AnalysisResultPayload } from '../analysisEvents';
import tauriIPC from '../tauriIPC';
import type { AnalysisHandlerDeps, PowerTestOptions } from './types';

export const createRunPowerTest =
  (deps: AnalysisHandlerDeps) =>
  async (options: PowerTestOptions): Promise<void> => {
    const analysis = await tauriIPC.runPowerTest(options);

    const payload: AnalysisResultPayload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: 'power',
      label: '検定力分析',
      timestamp: analysis.loggedAt,
      result: analysis.result,
    };

    await deps.openResultWindow();
    await deps.emitResult(payload);
    deps.onClosePower();
  };
