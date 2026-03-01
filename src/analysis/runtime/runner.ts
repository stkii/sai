import type { AnalysisOptions, AnalysisRunResult, ImportDataset, SupportedAnalysisType } from '../../types';

export interface AnalysisInput {
  type: SupportedAnalysisType;
  selection: ImportDataset;
  variables: string[];
  options?: AnalysisOptions;
}

export interface AnalysisRunnerDeps {
  buildNumericDataset: (selection: ImportDataset, variables: string[]) => Promise<string>;
  runAnalysis: (
    type: SupportedAnalysisType,
    datasetCacheId: string,
    options: AnalysisOptions
  ) => Promise<AnalysisRunResult>;
}

export interface AnalysisRunner {
  run: (input: AnalysisInput) => Promise<AnalysisRunResult>;
  clearCache: () => void;
}

const buildDatasetCacheKey = (selection: ImportDataset, variables: string[]) => {
  const uniqueVariables = Array.from(new Set(variables));
  uniqueVariables.sort();
  return [selection.path, selection.sheet ?? '', ...uniqueVariables].join('||');
};

export const createAnalysisRunner = ({
  buildNumericDataset,
  runAnalysis,
}: AnalysisRunnerDeps): AnalysisRunner => {
  const datasetCache = new Map<string, string>();

  const run = async ({ type, selection, variables, options }: AnalysisInput): Promise<AnalysisRunResult> => {
    if (variables.length === 0) {
      throw new Error('変数を選択してください');
    }

    const cacheKey = buildDatasetCacheKey(selection, variables);
    let datasetCacheId = datasetCache.get(cacheKey) ?? null;

    if (!datasetCacheId) {
      datasetCacheId = await buildNumericDataset(selection, variables);
      datasetCache.set(cacheKey, datasetCacheId);
    }

    return runAnalysis(type, datasetCacheId, options ?? {});
  };

  const clearCache = () => {
    datasetCache.clear();
  };

  return { run, clearCache };
};
