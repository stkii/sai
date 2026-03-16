import type {
  AnalysisExecutionRecord,
  AnalysisOptions,
  DatasetKind,
  SupportedAnalysisType,
} from '../../analysis/api';
import { tauriIpc } from '../../ipc';
import type { Dataset } from '../../types';
import { emitResultToResultWindow, openResultWindow } from './toResultWindow';

interface AnalyzeServiceLike {
  run: (params: {
    selection: Dataset | null;
    type: SupportedAnalysisType;
    variables: string[];
    options: AnalysisOptions;
    datasetKind?: DatasetKind;
  }) => Promise<AnalysisExecutionRecord>;
}

interface RunAnalysisFlowParams {
  analyzeService: AnalyzeServiceLike;
  selection: Dataset | null;
  type: SupportedAnalysisType;
  variables: string[];
  options: AnalysisOptions;
  datasetKind?: DatasetKind;
  onCompleted: () => void;
}

export const runAnalysisFlow = async ({
  analyzeService,
  selection,
  type,
  variables,
  options,
  datasetKind,
  onCompleted,
}: RunAnalysisFlowParams): Promise<void> => {
  const execution = await analyzeService.run({
    selection,
    type,
    variables,
    options,
    datasetKind,
  });
  if (!selection) {
    throw new Error('データが読み込まれていません');
  }
  const payload =
    (await tauriIpc.getSessionAnalysisLog(execution.executionId)) ??
    (await tauriIpc.getAnalysisLog(execution.executionId));
  if (!payload) {
    throw new Error('分析ログの取得に失敗しました');
  }
  await openResultWindow();
  await emitResultToResultWindow(payload);
  onCompleted();
};
