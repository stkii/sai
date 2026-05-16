import type { MethodModule } from '../contracts';
import { CorrelationModal } from './modal';
import { CorrelationResult } from './result';

export const correlationModule: MethodModule<'correlation'> = {
  definition: { key: 'correlation', label: '相関分析' },
  renderModal: (props) => <CorrelationModal {...props} />,
  renderResult: (result) => <CorrelationResult result={result} />,
};
