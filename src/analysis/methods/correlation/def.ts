import type { AnalysisMethodDefinition } from '../../registry/types';

export const correlationDefinition: AnalysisMethodDefinition<'correlation'> = {
  key: 'correlation',
  label: '相関',
  requiresDataset: true,
};
