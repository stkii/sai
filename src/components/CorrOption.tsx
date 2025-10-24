import type { ChangeEvent, FC } from 'react';

import type { CorrAlt, CorrMethods, CorrOptionValue, CorrUse } from '../types';

type Props = {
  value: CorrOptionValue;
  onChange: (next: CorrOptionValue) => void;
  className?: string;
};

const CorrOption: FC<Props> = ({ value, onChange, className }) => {
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
    <div
      className={['flex flex-col justify-start border rounded-lg p-2 h-full', className || '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mb-1">
        <span className="font-semibold mb-1 block">相関係数</span>
        <div className="flex flex-col gap-1 mt-0.5">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={value.methods.pearson} onChange={toggleMethod('pearson')} />
            Pearson
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={value.methods.kendall} onChange={toggleMethod('kendall')} />
            Kendall
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={value.methods.spearman} onChange={toggleMethod('spearman')} />
            Spearman
          </label>
        </div>
      </div>

      <div className="mb-1">
        <span className="font-semibold mb-1 block">検定</span>
        <div className="flex flex-col gap-1 mt-0.5">
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name="corr-alt"
              value="two.sided"
              checked={value.alt === 'two.sided'}
              onChange={changeAlt('two.sided')}
            />
            両側
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name="corr-alt"
              value="greater"
              checked={value.alt === 'greater'}
              onChange={changeAlt('greater')}
            />
            片側（大きい側）
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name="corr-alt"
              value="less"
              checked={value.alt === 'less'}
              onChange={changeAlt('less')}
            />
            片側（小さい側）
          </label>
        </div>
      </div>

      <div>
        <span className="font-semibold mb-1 block">欠損の扱い</span>
        <div className="flex flex-col gap-1 mt-0.5">
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name="corr-use"
              value="all.obs"
              checked={value.use === 'all.obs'}
              onChange={changeUse('all.obs')}
            />
            all.obs（欠損があるとエラー）
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name="corr-use"
              value="complete.obs"
              checked={value.use === 'complete.obs'}
              onChange={changeUse('complete.obs')}
            />
            complete.obs（行単位で完全データのみ）
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name="corr-use"
              value="pairwise.complete.obs"
              checked={value.use === 'pairwise.complete.obs'}
              onChange={changeUse('pairwise.complete.obs')}
            />
            pairwise.complete.obs（変数ペアごとに有効データ）
          </label>
        </div>
      </div>
    </div>
  );
};

export default CorrOption;
