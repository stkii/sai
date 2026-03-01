import type { AnalysisMethodDefinition } from '../../registry/types';

export const descriptiveDefinition: AnalysisMethodDefinition<'descriptive'> = {
  key: 'descriptive',
  label: '記述統計',
  requiresDataset: true,
};
