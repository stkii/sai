import type { MethodModule } from '../contracts';
import { FactorModal } from './modal';

export const factorModule: MethodModule<'factor'> = {
  definition: { key: 'factor', label: '因子分析' },
  renderModal: (props) => <FactorModal {...props} />,
};
