import { defineMethod } from '../contracts';
import { formatReliabilityOptions, ReliabilityModal, type ReliabilityOptions } from './modal';

export const reliabilityModule = defineMethod<'reliability', ReliabilityOptions>({
  definition: { key: 'reliability', label: '信頼性分析' },
  renderModal: (props) => <ReliabilityModal {...props} />,
  formatOptions: formatReliabilityOptions,
});
