import type { MethodModule } from '../contracts';
import { DescriptiveModal } from './modal';

export const descriptiveModule: MethodModule<'describe'> = {
  definition: { key: 'describe', label: '記述統計' },
  renderModal: (props) => <DescriptiveModal {...props} />,
};
