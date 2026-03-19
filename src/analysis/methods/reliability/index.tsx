import type { MethodDefinition, MethodModule } from '../contracts';
import { ReliabilityModal } from './modal';
import { buildReliabilityExportSections, renderReliabilityResult } from './result';

export const reliabilityDefinition: MethodDefinition<'reliability'> = {
  key: 'reliability',
  label: '信頼性分析',
};

export const reliabilityMethod: MethodModule<'reliability'> = {
  definition: reliabilityDefinition,
  renderModal: ({ open, onClose, variables, onExecute }) => {
    return (
      <ReliabilityModal open={open} onClose={onClose} variables={variables} onExecute={onExecute} />
    );
  },
  renderResult: renderReliabilityResult,
  buildExportSections: buildReliabilityExportSections,
};
