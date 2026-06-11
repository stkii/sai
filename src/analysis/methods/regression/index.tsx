import type { MethodModule } from '../contracts';
import { formatRegressionOptions, RegressionModal } from './modal';

export const regressionModule: MethodModule<'regression'> = {
  definition: { key: 'regression', label: '回帰分析' },
  renderModal: (props) => <RegressionModal {...props} />,
  formatOptions: formatRegressionOptions,
};
