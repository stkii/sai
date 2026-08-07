import { defineMethod } from '../contracts';
import { DescribeModal, type DescribeOptions, formatDescribeOptions } from './modal';

export const describeModule = defineMethod<'describe', DescribeOptions>({
  definition: { key: 'describe', label: '記述統計' },
  renderModal: (props) => <DescribeModal {...props} />,
  formatOptions: formatDescribeOptions,
});
