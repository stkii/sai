import type { AnalysisRunResult } from './dto';

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
  datasetId: string;
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

export type AnalysisType = 'descriptive' | 'correlation' | 'regression' | 'reliability' | 'factor' | 'power';

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
    let datasetId = cache.get(key) ?? null;

    if (!datasetId) {
      datasetId = await buildNumericDataset(selection, variables);
      cache.set(key, datasetId);
    }

    return handler({ datasetId, options: options ?? {} });
  };

  const clearCache = () => {
    cache.clear();
  };

  return { run, clearCache };
};
