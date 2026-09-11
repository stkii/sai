import { defineMethod } from '../contracts';
import { formatMdsOptions, MdsModal, type MdsOptions } from './modal';
import { MdsResult } from './result';

export const mdsModule = defineMethod<'mds', MdsOptions>({
  definition: { key: 'mds', label: '多次元尺度構成法' },
  renderModal: (props) => <MdsModal {...props} />,
  renderResult: (result) => <MdsResult result={result} />,
  formatOptions: formatMdsOptions,
});
