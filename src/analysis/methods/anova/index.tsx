import type { MethodModule } from '../contracts';
import { AnovaModal } from './modal';
import { AnovaResult } from './result';

export const anovaModule: MethodModule<'anova'> = {
  definition: { key: 'anova', label: '分散分析' },
  renderModal: (props) => <AnovaModal {...props} />,
  renderResult: (result) => <AnovaResult result={result} />,
};
