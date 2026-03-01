import type { AnalysisMethodModule } from '../../registry/types';
import { descriptiveDefinition } from './def';
import DescriptiveModal from './modal';
import { buildDescriptiveExportSections, renderDescriptiveResult } from './result';

const descriptiveMethod: AnalysisMethodModule<'descriptive'> = {
  definition: descriptiveDefinition,
  renderModal: ({ open, onClose, variables, onExecute }) => (
    <DescriptiveModal open={open} onClose={onClose} variables={variables} onExecute={onExecute} />
  ),
  renderResult: renderDescriptiveResult,
  buildExportSections: buildDescriptiveExportSections,
};

export default descriptiveMethod;
