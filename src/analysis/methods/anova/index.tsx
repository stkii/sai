import { defineMethod } from '../contracts';
import { AnovaModal, type AnovaOptions, formatAnovaOptions } from './modal';

export const anovaModule = defineMethod<'anova', AnovaOptions>({
  definition: { key: 'anova', label: '分散分析' },
  renderModal: (props) => <AnovaModal {...props} />,
  formatOptions: formatAnovaOptions,
});
