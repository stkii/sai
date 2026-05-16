import type { MethodModule } from '../contracts';
import { ReliabilityModal } from './modal';
import { ReliabilityResult } from './result';

export const reliabilityModule: MethodModule<'reliability'> = {
  definition: { key: 'reliability', label: '信頼性分析' },
  renderModal: (props) => <ReliabilityModal {...props} />,
  renderResult: (result) => <ReliabilityResult result={result} />,
};
