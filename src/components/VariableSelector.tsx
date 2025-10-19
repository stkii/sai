import { useMemo, useState, type FC, type ChangeEvent } from 'react';

import BaseButton from './BaseButton';

type Props = {
  allVariables: string[];
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
  leftLabel?: string;
  rightLabel?: string;
};

// チェックボックス方式の変数選択（検索バーはプレースホルダ）
const VariableSelector: FC<Props> = ({
  allVariables,
  value,
  onChange,
  className,
  leftLabel = '変数一覧',
  rightLabel = '分析に使用する変数',
}) => {
  const available = useMemo(() => {
    const selectedSet = new Set(value);
    return allVariables.filter((v) => !selectedSet.has(v));
  }, [allVariables, value]);

  const [leftChecked, setLeftChecked] = useState<Record<string, boolean>>({});
  const [rightChecked, setRightChecked] = useState<Record<string, boolean>>({});

  const handleAdd = () => {
    const picked = available.filter((v) => rightChecked[v]);
    if (picked.length === 0) return;
    onChange([...value, ...picked]);
    setRightChecked({});
  };

  const handleRemove = () => {
    const toRemove = new Set(Object.keys(leftChecked).filter((k) => leftChecked[k]));
    if (toRemove.size === 0) return;
    const next = value.filter((v) => !toRemove.has(v));
    onChange(next);
    setLeftChecked({});
  };

  const onLeftChange = (e: ChangeEvent<HTMLInputElement>, name: string) => {
    const checked = (e.target as HTMLInputElement).checked;
    setLeftChecked((cur) => ({ ...cur, [name]: checked }));
  };

  const onRightChange = (e: ChangeEvent<HTMLInputElement>, name: string) => {
    const checked = (e.target as HTMLInputElement).checked;
    setRightChecked((cur) => ({ ...cur, [name]: checked }));
  };

  return (
    <div className={`varsel ${className ?? ''}`.trim()}>
      <div className="varsel__search">
        <input className="varsel__searchInput" placeholder="検索（未実装）" disabled />
      </div>
      <div className="varsel__cols">
        <div className="varsel__panel">
          <div className="varsel__label">{leftLabel}</div>
          <div className="varsel__items" role="listbox" aria-multiselectable>
            {available.map((name) => (
              <label key={`right-${name}`} className="varsel__item" title={name}>
                <input
                  type="checkbox"
                  checked={!!rightChecked[name]}
                  onChange={(e) => onRightChange(e as unknown as ChangeEvent<HTMLInputElement>, name)}
                />
                <span className="varsel__name">{name}</span>
              </label>
            ))}
            {available.length === 0 && <div className="muted small">全て追加済み</div>}
          </div>
        </div>
        <div className="varsel__panel">
          <div className="varsel__label">{rightLabel}</div>
          <div className="varsel__items" role="listbox" aria-multiselectable>
            {value.map((name) => (
              <label key={`left-${name}`} className="varsel__item" title={name}>
                <input
                  type="checkbox"
                  checked={!!leftChecked[name]}
                  onChange={(e) => onLeftChange(e as unknown as ChangeEvent<HTMLInputElement>, name)}
                />
                <span className="varsel__name">{name}</span>
              </label>
            ))}
            {value.length === 0 && <div className="muted small">未選択</div>}
          </div>
        </div>
      </div>
      <div className="varsel__footer">
        <BaseButton widthGroup="analysis-primary" onClick={handleAdd} label={<>追加</>} />
        <BaseButton widthGroup="analysis-secondary" onClick={handleRemove} label={<>削除</>} />
      </div>
    </div>
  );
};

export default VariableSelector;
