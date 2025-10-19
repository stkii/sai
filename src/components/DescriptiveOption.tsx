import { type FC } from 'react';

import type { DescriptiveOrder } from '../types';

/**
 * Props for the DescriptiveOption component.
 * @property {DescriptiveOrder} value - The current display order option
 * @property {Function} onChange - Callback invoked when the display order changes
 */
type Props = {
  value: DescriptiveOrder;
  onChange: (next: DescriptiveOrder) => void;
};

/**
 * Radio button selector for descriptive statistics display order.
 * Allows users to choose between default variable order, ascending mean, or descending mean.
 *
 * @component
 * @param {Props} props - Component props
 * @returns {JSX.Element} A fieldset with three radio button options
 */
const DescriptiveOption: FC<Props> = ({ value, onChange }) => {
  return (
    <fieldset className="option-group">
      <legend>表示順</legend>
      <label className="radio">
        <input
          type="radio"
          name="desc-order"
          value="default"
          checked={value === 'default'}
          onChange={() => onChange('default')}
        />
        変数リスト順（デフォルト）
      </label>
      <label className="radio">
        <input
          type="radio"
          name="desc-order"
          value="mean_asc"
          checked={value === 'mean_asc'}
          onChange={() => onChange('mean_asc')}
        />
        平均値による昇順
      </label>
      <label className="radio">
        <input
          type="radio"
          name="desc-order"
          value="mean_desc"
          checked={value === 'mean_desc'}
          onChange={() => onChange('mean_desc')}
        />
        平均値による降順
      </label>
    </fieldset>
  );
};

export default DescriptiveOption;
