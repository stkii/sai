import type { AnalysisMethodModule } from '../contracts';
import { correlationDefinition } from './def';
import CorrelationModal from './modal';
import { buildCorrelationExportSections, renderCorrelationResult } from './result';

const correlationMethod: AnalysisMethodModule<'correlation'> = {
  definition: correlationDefinition,
  renderModal: ({ open, onClose, variables, onExecute }) => (
    <CorrelationModal open={open} onClose={onClose} variables={variables} onExecute={onExecute} />
  ),
  renderResult: renderCorrelationResult,
  buildExportSections: buildCorrelationExportSections,
};

export default correlationMethod;
