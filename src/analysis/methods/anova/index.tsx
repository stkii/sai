import type { MethodModule } from '../contracts';
import { AnovaModal } from './modal';

export const anovaModule: MethodModule<'anova'> = {
  definition: { key: 'anova', label: '分散分析' },
  renderModal: (props) => <AnovaModal {...props} />,
};
