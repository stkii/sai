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
  buildStringMixedDataset: (selection: Dataset, variables: string[]) => Promise<string>;
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

const buildDatasetCacheKey = (selection: Dataset, variables: string[], datasetKind: string) => {
  const uniqueVariables = Array.from(new Set(variables));
  uniqueVariables.sort();
  return [datasetKind, selection.path, selection.sheet ?? '', ...uniqueVariables].join('||');
};

export const createAnalysisRunner = ({
  buildNumericDataset,
  buildStringMixedDataset,
  runAnalysis,
}: AnalysisRunnerDeps): AnalysisRunner => {
  const datasetCache = new Map<string, string>();

  const run = async ({
    type,
    selection,
    variables,
    options,
    datasetKind = 'numeric',
  }: AnalysisRunRequest): Promise<AnalysisExecutionRecord> => {
    if (variables.length === 0) {
      throw new Error('変数を選択してください');
    }

    const cacheKey = buildDatasetCacheKey(selection, variables, datasetKind);
    let datasetCacheId = datasetCache.get(cacheKey) ?? null;

    if (!datasetCacheId) {
      datasetCacheId =
        datasetKind === 'string_mixed'
          ? await buildStringMixedDataset(selection, variables)
          : await buildNumericDataset(selection, variables);
      datasetCache.set(cacheKey, datasetCacheId);
    }

    return runAnalysis(type, datasetCacheId, options);
  };

  const clearCache = () => {
    datasetCache.clear();
  };

  return { run, clearCache };
};
