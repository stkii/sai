import type {
  AnalysisExecutionRecord,
  AnalysisOptions,
  DatasetKind,
  MethodModule,
  SupportedAnalysisType,
} from '../../analysis/api';
import type { Dataset } from '../../types';
import { buildAnalysisResultPayload, findMethodLabel } from './displayFormatter';
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
  methods: readonly MethodModule[];
  selection: Dataset | null;
  type: SupportedAnalysisType;
  variables: string[];
  options: AnalysisOptions;
  datasetKind?: DatasetKind;
  onCompleted: () => void;
}

export const runAnalysisFlow = async ({
  analyzeService,
  methods,
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
  const label = findMethodLabel(methods, type);
  const payload = buildAnalysisResultPayload({
    execution,
    type,
    label,
    options,
  });
  await openResultWindow();
  await emitResultToResultWindow(payload);
  onCompleted();
};
