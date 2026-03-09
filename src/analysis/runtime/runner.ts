import type { Dataset } from '../../types';
import type {
  AnalysisOptions,
  AnalysisResult,
  AnalysisRunRequest,
  SupportedAnalysisType,
} from '../types';

export interface AnalysisExecutionRecord {
  executionId: string;
  executedAt: string;
  output: AnalysisResult;
}

export interface AnalysisRunnerDeps {
  buildNumericDataset: (selection: Dataset, variables: string[]) => Promise<string>;
  runAnalysis: (
    type: SupportedAnalysisType,
    datasetCacheId: string,
    options: AnalysisOptions
  ) => Promise<AnalysisExecutionRecord>;
}

export interface AnalysisRunner {
  run: (request: AnalysisRunRequest) => Promise<AnalysisExecutionRecord>;
  clearCache: () => void;
}

const buildDatasetCacheKey = (selection: Dataset, variables: string[]) => {
  const uniqueVariables = Array.from(new Set(variables));
  uniqueVariables.sort();
  return [selection.path, selection.sheet ?? '', ...uniqueVariables].join('||');
};

export const createAnalysisRunner = ({
  buildNumericDataset,
  runAnalysis,
}: AnalysisRunnerDeps): AnalysisRunner => {
  const datasetCache = new Map<string, string>();

  const run = async ({
    type,
    selection,
    variables,
    options,
  }: AnalysisRunRequest): Promise<AnalysisExecutionRecord> => {
    if (variables.length === 0) {
      throw new Error('変数を選択してください');
    }

    const cacheKey = buildDatasetCacheKey(selection, variables);
    let datasetCacheId = datasetCache.get(cacheKey) ?? null;

    if (!datasetCacheId) {
      datasetCacheId = await buildNumericDataset(selection, variables);
      datasetCache.set(cacheKey, datasetCacheId);
    }

    return runAnalysis(type, datasetCacheId, options);
  };

  const clearCache = () => {
    datasetCache.clear();
  };

  return { run, clearCache };
};
