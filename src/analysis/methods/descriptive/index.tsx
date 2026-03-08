import type { MethodDefinition, MethodModule } from '../contracts';
import { DescriptiveModal } from './modal';
import { buildDescriptiveExportSections, renderDescriptiveResult } from './result';

export const descriptiveDefinition: MethodDefinition<'descriptive'> = {
  key: 'descriptive',
  label: '記述統計',
};

export const descriptiveMethod: MethodModule<'descriptive'> = {
  definition: descriptiveDefinition,
  renderModal: ({ open, onClose, variables, onExecute }) => {
    return (
      <DescriptiveModal open={open} onClose={onClose} variables={variables} onExecute={onExecute} />
    );
  },
  renderResult: renderDescriptiveResult,
  buildExportSections: buildDescriptiveExportSections,
};

export type { DescriptiveOptions, DescriptiveOrder } from './modal';
export { DescriptiveModal } from './modal';
export { buildDescriptiveExportSections, renderDescriptiveResult } from './result';
