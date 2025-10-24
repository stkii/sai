import { type ChangeEvent, type FC, useMemo, useState } from 'react';

import BaseButton from './BaseButton';

type Props = {
  allVariables: string[];
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
  leftLabel?: string;
  rightLabel?: string;
};

const VariableSelector: FC<Props> = ({
  allVariables,
  value,
  onChange,
  className,
  leftLabel = '変数一覧',
  rightLabel = '使用変数',
}) => {
  const available = useMemo(() => {
    const selectedSet = new Set(value);
    return allVariables.filter((v) => !selectedSet.has(v));
  }, [allVariables, value]);

  const [availChecked, setAvailChecked] = useState<Record<string, boolean>>({});
  const [selectedChecked, setSelectedChecked] = useState<Record<string, boolean>>({});

  const handleAdd = () => {
    const picked = available.filter((v) => availChecked[v]);
    if (picked.length === 0) return;
    onChange([...value, ...picked]);
    setAvailChecked({});
  };

  const handleRemove = () => {
    const toRemove = new Set(Object.keys(selectedChecked).filter((k) => selectedChecked[k]));
    if (toRemove.size === 0) return;
    const next = value.filter((v) => !toRemove.has(v));
    onChange(next);
    setSelectedChecked({});
  };

  const onAvailChange = (e: ChangeEvent<HTMLInputElement>, name: string) => {
    const checked = (e.target as HTMLInputElement).checked;
    setAvailChecked((cur) => ({ ...cur, [name]: checked }));
  };

  const onSelectedChange = (e: ChangeEvent<HTMLInputElement>, name: string) => {
    const checked = (e.target as HTMLInputElement).checked;
    setSelectedChecked((cur) => ({ ...cur, [name]: checked }));
  };

  return (
    <div
      className={[
        'flex flex-col border rounded-lg px-2 pt-2 pb-3 h-full min-h-0 overflow-hidden',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex flex-row justify-between gap-4 h-full min-h-0">
        {/* 変数一覧 */}
        <div className="flex flex-col w-[45%] min-w-0 min-h-0">
          <span className="font-semibold mb-1">{leftLabel}</span>
          <div className="flex flex-col border rounded-md p-1 min-h-0 md:min-h-[260px] flex-1 overflow-auto">
            {available.map((name) => (
              <label key={`avail-${name}`} className="flex items-center gap-2 text-sm py-0.5" title={name}>
                <input
                  type="checkbox"
                  checked={!!availChecked[name]}
                  onChange={(e) => onAvailChange(e, name)}
                />
                <span className="truncate">{name}</span>
              </label>
            ))}
            {available.length === 0 && <div className="text-gray-500 text-xs">全て追加済み</div>}
          </div>
          <BaseButton className="mt-3 w-full" onClick={handleAdd} label={<>追加 →</>} />
        </div>

        {/* 使用変数 */}
        <div className="flex flex-col w-[45%] min-w-0 min-h-0">
          <span className="font-semibold mb-1">{rightLabel}</span>
          <div className="flex flex-col border rounded-md p-1 min-h-0 md:min-h-[260px] flex-1 overflow-auto">
            {value.map((name) => (
              <label key={`sel-${name}`} className="flex items-center gap-2 text-sm py-0.5" title={name}>
                <input
                  type="checkbox"
                  checked={!!selectedChecked[name]}
                  onChange={(e) => onSelectedChange(e, name)}
                />
                <span className="truncate">{name}</span>
              </label>
            ))}
            {value.length === 0 && <div className="text-gray-500 text-xs">未選択</div>}
          </div>
          <BaseButton className="mt-3 w-full" onClick={handleRemove} label={<>← 戻す</>} />
        </div>
      </div>
    </div>
  );
};

export default VariableSelector;
