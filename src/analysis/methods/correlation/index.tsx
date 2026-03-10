import type { MethodDefinition, MethodModule } from '../contracts';
import { CorrelationModal } from './modal';
import { buildCorrelationExportSections, renderCorrelationResult } from './result';

export const correlationDefinition: MethodDefinition<'correlation'> = {
  key: 'correlation',
  label: '相関',
};

export const correlationMethod: MethodModule<'correlation'> = {
  definition: correlationDefinition,
  renderModal: ({ open, onClose, variables, onExecute }) => {
    return (
      <CorrelationModal open={open} onClose={onClose} variables={variables} onExecute={onExecute} />
    );
  },
  renderResult: renderCorrelationResult,
  buildExportSections: buildCorrelationExportSections,
};

export type {
  CorrelationAlternative,
  CorrelationMethod,
  CorrelationOptions,
  CorrelationUse,
} from './modal';
export { CorrelationModal } from './modal';
export { buildCorrelationExportSections, renderCorrelationResult } from './result';
