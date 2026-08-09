import { defineMethod } from '../contracts';
import { formatReliabilityOptions, ReliabilityModal, type ReliabilityOptions } from './modal';

export const reliabilityModule = defineMethod<'reliability', ReliabilityOptions>({
  definition: { key: 'reliability', label: '信頼性' },
  renderModal: (props) => <ReliabilityModal {...props} />,
  formatOptions: formatReliabilityOptions,
});
