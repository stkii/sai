import { defineMethod } from '../contracts';
import { formatPowerOptions, PowerModal, type PowerOptions } from './modal';

export const powerModule = defineMethod<'power', PowerOptions>({
  definition: { key: 'power', label: '検出力分析', requiresDataset: false, persistHistory: false },
  renderModal: (props) => <PowerModal {...props} />,
  formatOptions: formatPowerOptions,
});
