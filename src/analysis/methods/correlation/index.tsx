import type { MethodModule } from '../contracts';
import { CorrelationModal, formatCorrelationOptions } from './modal';

export const correlationModule: MethodModule<'correlation'> = {
  definition: { key: 'correlation', label: '相関分析' },
  renderModal: (props) => <CorrelationModal {...props} />,
  formatOptions: formatCorrelationOptions,
};
