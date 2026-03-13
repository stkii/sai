import type { MethodDefinition, MethodModule } from '../contracts';
import { AnovaModal } from './modal';
import { buildAnovaExportSections, renderAnovaResult } from './result';

export const anovaDefinition: MethodDefinition<'anova'> = {
  key: 'anova',
  label: '分散分析',
};

export const anovaMethod: MethodModule<'anova'> = {
  definition: anovaDefinition,
  renderModal: ({ open, onClose, variables, onExecute }) => {
    return <AnovaModal open={open} onClose={onClose} variables={variables} onExecute={onExecute} />;
  },
  renderResult: renderAnovaResult,
  buildExportSections: buildAnovaExportSections,
};

export type { AnovaOptions } from './modal';
export { AnovaModal } from './modal';
export { buildAnovaExportSections, renderAnovaResult } from './result';
