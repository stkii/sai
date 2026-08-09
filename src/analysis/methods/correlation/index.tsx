import { defineMethod } from '../contracts';
import { CorrelationModal, type CorrelationOptions, formatCorrelationOptions } from './modal';

export const correlationModule = defineMethod<'correlation', CorrelationOptions>({
  definition: { key: 'correlation', label: '相関' },
  renderModal: (props) => <CorrelationModal {...props} />,
  formatOptions: formatCorrelationOptions,
});
