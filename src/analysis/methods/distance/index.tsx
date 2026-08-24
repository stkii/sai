import { defineMethod } from '../contracts';
import { DistanceModal, type DistanceOptions, formatDistanceOptions } from './modal';

export const distanceModule = defineMethod<'distance', DistanceOptions>({
  definition: { key: 'distance', label: '距離' },
  renderModal: (props) => <DistanceModal {...props} />,
  formatOptions: formatDistanceOptions,
});
