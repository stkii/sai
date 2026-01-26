import type { AnalysisRunResult } from '../../dto';
import tauriIPC from '../../tauriIPC';

export const runPowerTest = async (options: Record<string, unknown> = {}): Promise<AnalysisRunResult> => {
  return tauriIPC.runPowerTest(options);
};
