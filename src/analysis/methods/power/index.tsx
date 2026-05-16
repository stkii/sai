import type { MethodModule } from '../contracts';
import { PowerModal } from './modal';
import { PowerResult } from './result';

export const powerModule: MethodModule<'power'> = {
  definition: { key: 'power', label: '検出力分析', requiresDataset: false },
  renderModal: (props) => <PowerModal {...props} />,
  renderResult: (result) => <PowerResult result={result} />,
};
