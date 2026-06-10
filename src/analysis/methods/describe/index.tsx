import type { MethodModule } from '../contracts';
import { DescribeModal } from './modal';

export const describeModule: MethodModule<'describe'> = {
  definition: { key: 'describe', label: '記述統計' },
  renderModal: (props) => <DescribeModal {...props} />,
};
