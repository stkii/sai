import { defineMethod } from '../contracts';
import { formatRegressionOptions, RegressionModal, type RegressionOptions } from './modal';

export const regressionModule = defineMethod<'regression', RegressionOptions>({
  definition: { key: 'regression', label: '回帰分析' },
  renderModal: (props) => <RegressionModal {...props} />,
  formatOptions: formatRegressionOptions,
});
