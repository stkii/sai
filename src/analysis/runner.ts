import type { AnalysisRunResult } from '../dto';
import type { AnalysisType } from './analysisRegistry';

export interface AnalysisOptions {
  order?: string;
  naIgnore?: boolean;
  [key: string]: unknown;
}

export interface AnalysisSelection {
  path: string;
  sheet?: string;
}

export interface AnalysisInput {
  type: AnalysisType;
  selection: AnalysisSelection;
  variables: string[];
  options?: AnalysisOptions;
}

export interface AnalysisHandlerContext {
  datasetCacheId: string;
  options: AnalysisOptions;
}

export interface AnalysisHandlers {
  descriptive: (context: AnalysisHandlerContext) => Promise<AnalysisRunResult>;
  correlation?: (context: AnalysisHandlerContext) => Promise<AnalysisRunResult>;
  regression?: (context: AnalysisHandlerContext) => Promise<AnalysisRunResult>;
  reliability?: (context: AnalysisHandlerContext) => Promise<AnalysisRunResult>;
  factor?: (context: AnalysisHandlerContext) => Promise<AnalysisRunResult>;
  power?: (context: AnalysisHandlerContext) => Promise<AnalysisRunResult>;
}

export interface AnalysisRunnerDeps {
  buildNumericDataset: (selection: AnalysisSelection, variables: string[]) => Promise<string>;
  analyses: AnalysisHandlers;
}

export interface AnalysisRunner {
  run: (input: AnalysisInput) => Promise<AnalysisRunResult>;
  clearCache: () => void;
}

const buildCacheKey = (selection: AnalysisSelection, variables: string[]) => {
  const unique = Array.from(new Set(variables));
  unique.sort();
  return [selection.path, selection.sheet ?? '', ...unique].join('||');
};

export const createAnalysisRunner = ({
  buildNumericDataset,
  analyses,
}: AnalysisRunnerDeps): AnalysisRunner => {
  const cache = new Map<string, string>();

  const run = async ({ type, selection, variables, options }: AnalysisInput) => {
    const handler = analyses[type];
    if (!handler) {
      throw new Error(`未対応の分析タイプです: ${type}`);
    }
    if (variables.length === 0) {
      throw new Error('変数を選択してください');
    }

    const key = buildCacheKey(selection, variables);
    let datasetCacheId = cache.get(key) ?? null;

    if (!datasetCacheId) {
      datasetCacheId = await buildNumericDataset(selection, variables);
      cache.set(key, datasetCacheId);
    }

    return handler({ datasetCacheId, options: options ?? {} });
  };

  const clearCache = () => {
    cache.clear();
  };

  return { run, clearCache };
};
