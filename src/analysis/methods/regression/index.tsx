import type { MethodDefinition, MethodModule } from '../contracts';
import { RegressionModal } from './modal';
import { buildRegressionExportSections, renderRegressionResult } from './result';

export const regressionDefinition: MethodDefinition<'regression'> = {
  key: 'regression',
  label: '回帰分析',
};

export const regressionMethod: MethodModule<'regression'> = {
  definition: regressionDefinition,
  renderModal: ({ open, onClose, variables, onExecute }) => {
    return (
      <RegressionModal open={open} onClose={onClose} variables={variables} onExecute={onExecute} />
    );
  },
  renderResult: renderRegressionResult,
  buildExportSections: buildRegressionExportSections,
};
