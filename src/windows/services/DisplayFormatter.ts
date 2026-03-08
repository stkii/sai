import type {
  AnalysisExecutionRecord,
  AnalysisOptions,
  AnalysisResultPayload,
  MethodModule,
  SupportedAnalysisType,
} from '../../analysis/api';
import type { Dataset } from '../../types';

interface BuildResultPayloadParams {
  execution: AnalysisExecutionRecord;
  type: SupportedAnalysisType;
  label: string;
  options: AnalysisOptions;
}

export const buildMethodItems = (methods: readonly MethodModule[]) => {
  return methods.map((method) => ({
    label: method.definition.label,
    value: method.definition.key,
  }));
};

export const buildSelectedLabel = (selection: Dataset | null): string | null => {
  if (!selection) {
    return null;
  }
  return selection.sheet ? `${selection.path}（${selection.sheet}）` : selection.path;
};

const findMethodByType = (
  methods: readonly MethodModule[],
  type: SupportedAnalysisType | null
): MethodModule | null => {
  if (!type) {
    return null;
  }
  return methods.find((method) => method.definition.key === type) ?? null;
};

export const findMethodLabel = (
  methods: readonly MethodModule[],
  type: SupportedAnalysisType
): string => {
  return findMethodByType(methods, type)?.definition.label ?? type;
};

export const buildAnalysisResultPayload = ({
  execution,
  type,
  label,
  options,
}: BuildResultPayloadParams): AnalysisResultPayload => {
  return {
    id: execution.executionId,
    type,
    label,
    timestamp: execution.executedAt,
    options,
    result: execution.output,
  };
};
