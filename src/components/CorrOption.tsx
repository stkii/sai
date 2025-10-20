import { type ChangeEvent, type FC } from 'react';

import type { CorrAlt, CorrMethods, CorrOptionValue, CorrUse } from '../types';

type Props = {
  value: CorrOptionValue;
  onChange: (next: CorrOptionValue) => void;
};

const CorrOption: FC<Props> = ({ value, onChange }) => {
  const toggleMethod = (key: keyof CorrMethods) => (e: ChangeEvent<HTMLInputElement>) => {
    const checked = (e.target as HTMLInputElement).checked;
    onChange({ ...value, methods: { ...value.methods, [key]: checked } });
  };

  const changeAlt = (alt: CorrAlt) => () => {
    onChange({ ...value, alt });
  };

  const changeUse = (use: CorrUse) => () => {
    onChange({ ...value, use });
  };

  return (
    <div>
      <fieldset className="option-group mb-2">
        <legend>相関係数</legend>
        <label className="radio">
          <input type="checkbox" checked={value.methods.pearson} onChange={toggleMethod('pearson')} />
          Pearson
        </label>
        <label className="radio">
          <input type="checkbox" checked={value.methods.kendall} onChange={toggleMethod('kendall')} />
          Kendall
        </label>
        <label className="radio">
          <input type="checkbox" checked={value.methods.spearman} onChange={toggleMethod('spearman')} />
          Spearman
        </label>
      </fieldset>

      <fieldset className="option-group mb-2">
        <legend>検定</legend>
        <label className="radio">
          <input
            type="radio"
            name="corr-alt"
            value="two.sided"
            checked={value.alt === 'two.sided'}
            onChange={changeAlt('two.sided')}
          />
          両側
        </label>
        <label className="radio">
          <input
            type="radio"
            name="corr-alt"
            value="greater"
            checked={value.alt === 'greater'}
            onChange={changeAlt('greater')}
          />
          片側（大きい側）
        </label>
        <label className="radio">
          <input
            type="radio"
            name="corr-alt"
            value="less"
            checked={value.alt === 'less'}
            onChange={changeAlt('less')}
          />
          片側（小さい側）
        </label>
      </fieldset>

      <fieldset className="option-group">
        <legend>欠損の扱い</legend>
        <label className="radio">
          <input
            type="radio"
            name="corr-use"
            value="all.obs"
            checked={value.use === 'all.obs'}
            onChange={changeUse('all.obs')}
          />
          all.obs（欠損があるとエラー）
        </label>
        <label className="radio">
          <input
            type="radio"
            name="corr-use"
            value="complete.obs"
            checked={value.use === 'complete.obs'}
            onChange={changeUse('complete.obs')}
          />
          complete.obs（行単位で完全データのみ）
        </label>
        <label className="radio">
          <input
            type="radio"
            name="corr-use"
            value="pairwise.complete.obs"
            checked={value.use === 'pairwise.complete.obs'}
            onChange={changeUse('pairwise.complete.obs')}
          />
          pairwise.complete.obs（変数ペアごとに有効データ）
        </label>
      </fieldset>
    </div>
  );
};

export default CorrOption;
