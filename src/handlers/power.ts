import type { AnalysisResultPayload } from '../analysisEvents';
import { getAnalysisLabel } from '../analysisRegistry';
import tauriIPC from '../tauriIPC';
import type { AnalysisHandlerDeps, PowerTestOptions } from './types';

export const createRunPowerTest =
  (deps: AnalysisHandlerDeps) =>
  async (options: PowerTestOptions): Promise<void> => {
    const analysis = await tauriIPC.runPowerTest(options);

    const payload: AnalysisResultPayload = {
      id: analysis.analysisId,
      type: 'power',
      label: getAnalysisLabel('power'),
      timestamp: analysis.loggedAt,
      result: analysis.result,
    };

    await deps.openResultWindow();
    await deps.emitResult(payload);
    deps.onClosePower();
  };
