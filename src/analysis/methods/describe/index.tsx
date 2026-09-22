import { defineMethod } from '../contracts';
import { DescribeModal, type DescribeOptions, formatDescribeOptions } from './modal';
import { DescribeResult } from './result';

export const describeModule = defineMethod<'describe', DescribeOptions>({
  definition: { key: 'describe', label: '記述統計' },
  renderModal: (props) => <DescribeModal {...props} />,
  renderResult: (result) => <DescribeResult result={result} />,
  formatOptions: formatDescribeOptions,
});
