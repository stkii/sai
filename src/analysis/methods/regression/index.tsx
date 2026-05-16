import type { MethodModule } from '../contracts';
import { RegressionModal } from './modal';
import { RegressionResult } from './result';

export const regressionModule: MethodModule<'regression'> = {
  definition: { key: 'regression', label: '回帰分析' },
  renderModal: (props) => <RegressionModal {...props} />,
  renderResult: (result) => <RegressionResult result={result} />,
};
