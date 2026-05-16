import { invoke } from '@tauri-apps/api/core';
import type { AnalysisOptions, AnalysisResult, Method } from '../types';

export async function runAnalysis(args: {
  datasetKey: string | null;
  method: Method;
  variables: string[];
  options?: AnalysisOptions;
}): Promise<AnalysisResult> {
  return invoke<AnalysisResult>('run_analysis', {
    datasetKey: args.datasetKey,
    method: args.method,
    variables: args.variables,
    options: args.options ?? null,
  });
}
