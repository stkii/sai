import type { MethodDefinition, MethodModule } from '../contracts';
import { FactorModal } from './modal';
import { buildFactorExportSections, renderFactorResult } from './result';

export const factorDefinition: MethodDefinition<'factor'> = {
  key: 'factor',
  label: '因子分析',
};

export const factorMethod: MethodModule<'factor'> = {
  definition: factorDefinition,
  renderModal: ({ open, onClose, variables, onExecute }) => {
    return (
      <FactorModal open={open} onClose={onClose} variables={variables} onExecute={onExecute} />
    );
  },
  renderResult: renderFactorResult,
  buildExportSections: buildFactorExportSections,
};
