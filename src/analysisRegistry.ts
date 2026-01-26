export const ANALYSIS_ITEMS = [
  { label: '記述統計', value: 'descriptive' },
  { label: '相関', value: 'correlation' },
  { label: '回帰', value: 'regression' },
  { label: '信頼性', value: 'reliability' },
  { label: '因子分析', value: 'factor' },
  { label: '検定力分析', value: 'power' },
] as const;

export type AnalysisType = (typeof ANALYSIS_ITEMS)[number]['value'];

const ANALYSIS_ITEM_BY_VALUE = new Map<string, string>(
  ANALYSIS_ITEMS.map((item) => [item.value, item.label])
);

export const getAnalysisLabel = (type: string): string => {
  return ANALYSIS_ITEM_BY_VALUE.get(type) ?? type;
};

export const toAnalysisType = (value: string): AnalysisType | null => {
  if (ANALYSIS_ITEM_BY_VALUE.has(value)) {
    return value as AnalysisType;
  }
  return null;
};
