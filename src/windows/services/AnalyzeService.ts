import type {
  AnalysisExecutionRecord,
  AnalysisOptions,
  AnalysisRunner,
  SupportedAnalysisType,
} from '../../analysis/api';
import type { Dataset } from '../../types';

interface AnalyzeDeps {
  analysisRunner: AnalysisRunner;
  clearNumericDatasetCache: () => Promise<void>;
}

interface AnalyzeParams {
  selection: Dataset | null;
  type: SupportedAnalysisType;
  variables: string[];
  options: AnalysisOptions;
}

export const createAnalyzeService = ({ analysisRunner, clearNumericDatasetCache }: AnalyzeDeps) => {
  const run = async ({
    selection,
    type,
    variables,
    options,
  }: AnalyzeParams): Promise<AnalysisExecutionRecord> => {
    if (!selection) {
      throw new Error('データが読み込まれていません');
    }
    return analysisRunner.run({
      selection,
      type,
      variables,
      options,
    });
  };

  const clearCache = () => {
    analysisRunner.clearCache();
    void clearNumericDatasetCache().catch(() => {
      // キャッシュクリア失敗は次回実行時に再構築されるため無視する
    });
  };

  return {
    clearCache,
    run,
  };
};
