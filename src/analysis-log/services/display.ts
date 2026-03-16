import type { AnalysisLogSummary, MethodModule, SupportedAnalysisType } from '../../analysis/api';
import type { Dataset } from '../../types';
import { ALL_ANALYSIS_FILTER, type AnalysisFilter, type LogSource } from '../types';

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

export const getRecordCacheKey = (source: LogSource, id: string) => {
  return `${source}:${id}`;
};

export const getDatasetFileName = (dataset: Dataset | null): string => {
  if (!dataset) {
    return 'データ不明';
  }

  const parts = dataset.path.split(/[\\/]/);
  return parts[parts.length - 1] || dataset.path;
};

export const buildSearchText = (
  methods: readonly MethodModule[],
  summary: AnalysisLogSummary
): string => {
  return [
    findMethodLabel(methods, summary.type),
    buildSelectedLabel(summary.dataset) ?? '',
    getDatasetFileName(summary.dataset),
    summary.timestamp,
  ]
    .join('\n')
    .toLocaleLowerCase();
};

export const isMethodFilter = (value: string): value is AnalysisFilter => {
  return value === ALL_ANALYSIS_FILTER;
};

export const filterControlStyle = {
  width: '100%',
  border: '1px solid var(--chakra-colors-gray-200)',
  borderRadius: '0.375rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  boxSizing: 'border-box' as const,
};
