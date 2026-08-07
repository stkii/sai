import { defineMethod } from '../contracts';
import { FactorModal, type FactorOptions, formatFactorOptions } from './modal';

export const factorModule = defineMethod<'factor', FactorOptions>({
  definition: { key: 'factor', label: '因子分析' },
  renderModal: (props) => <FactorModal {...props} />,
  formatOptions: formatFactorOptions,
});
