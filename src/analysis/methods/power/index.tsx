import type { MethodModule } from '../contracts';
import { formatPowerOptions, PowerModal } from './modal';

export const powerModule: MethodModule<'power'> = {
  definition: { key: 'power', label: '検出力分析', requiresDataset: false, persistHistory: false },
  renderModal: (props) => <PowerModal {...props} />,
  formatOptions: formatPowerOptions,
};
