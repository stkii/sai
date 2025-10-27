import { type ChangeEvent, type FC, useMemo, useState } from 'react';

import BaseButton from './BaseButton';

type Props = {
  allVariables: string[];
  dependent: string | null;
  independents: string[];
  onChange: (next: { dependent: string | null; independents: string[] }) => void;
  className?: string;
};

const RegressionVariableSelector: FC<Props> = ({
  allVariables,
  dependent,
  independents,
  onChange,
  className,
}) => {
  const selectedSet = useMemo(
    () => new Set([...(independents || []), ...(dependent ? [dependent] : [])]),
    [dependent, independents]
  );

  const available = useMemo(() => {
    return allVariables.filter((v) => !selectedSet.has(v));
  }, [allVariables, selectedSet]);

  const [availChecked, setAvailChecked] = useState<Record<string, boolean>>({});
  const [indepChecked, setIndepChecked] = useState<Record<string, boolean>>({});

  const onAvailChange = (e: ChangeEvent<HTMLInputElement>, name: string) => {
    const checked = (e.target as HTMLInputElement).checked;
    setAvailChecked((cur) => ({ ...cur, [name]: checked }));
  };

  const onIndepChange = (e: ChangeEvent<HTMLInputElement>, name: string) => {
    const checked = (e.target as HTMLInputElement).checked;
    setIndepChecked((cur) => ({ ...cur, [name]: checked }));
  };

  // 従属変数: 左ペインでチェックされた変数が1件のときのみ採用
  const handleAddDependent = () => {
    const picked = available.filter((v) => availChecked[v]);
    if (picked.length !== 1) return;
    const nextDependent = picked[0];
    if (typeof nextDependent === 'undefined') return;
    onChange({ dependent: nextDependent, independents });
    setAvailChecked({});
  };

  const handleRemoveDependent = () => {
    if (!dependent) return;
    onChange({ dependent: null, independents });
  };

  // 独立変数: 左ペインのチェック全てを末尾に追加
  const handleAddIndependent = () => {
    const picked = available.filter((v) => availChecked[v]);
    if (picked.length === 0) return;
    const set = new Set(independents);
    const appended = [...independents];
    for (const name of picked) {
      if (!set.has(name)) {
        appended.push(name);
        set.add(name);
      }
    }
    onChange({ dependent, independents: appended });
    setAvailChecked({});
  };

  const handleRemoveIndependent = () => {
    const toRemove = new Set(Object.keys(indepChecked).filter((k) => indepChecked[k]));
    if (toRemove.size === 0) return;
    const next = independents.filter((v) => !toRemove.has(v));
    onChange({ dependent, independents: next });
    setIndepChecked({});
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
      <div className="flex flex-row justify-between gap-4 h-full min-h-0 items-stretch">
        {/* 変数一覧（左ペイン） */}
        <div className="flex flex-col w-[40%] min-w-0 min-h-0">
          <span className="font-semibold mb-1">変数一覧</span>
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
            {available.length === 0 && (
              <div className="text-gray-500 text-xs">追加可能な変数はありません</div>
            )}
          </div>
        </div>

        {/* 右ペイン：従属 + 独立（縦配置） */}
        <div className="flex flex-col w-[60%] min-w-0 min-h-0 gap-4">
          {/* 従属変数 */}
          <div className="flex flex-col min-h-0 shrink-0">
            <span className="font-semibold mb-1">従属変数</span>
            <div className="flex flex-col border rounded-md p-2 min-h-[48px] justify-center">
              {dependent ? (
                <div className="text-sm truncate" title={dependent}>
                  {dependent}
                </div>
              ) : (
                <div className="text-gray-500 text-xs">従属変数を追加してください</div>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <BaseButton onClick={handleAddDependent} label={<>追加 →</>} />
              <BaseButton onClick={handleRemoveDependent} label={<>← 削除</>} />
            </div>
          </div>

          {/* 独立変数 */}
          <div className="flex flex-col min-h-0 flex-1">
            <span className="font-semibold mb-1">独立変数</span>
            <div className="flex flex-col border rounded-md p-1 min-h-0 md:min-h-[180px] flex-1 overflow-auto">
              {independents.map((name) => (
                <label key={`indep-${name}`} className="flex items-center gap-2 text-sm py-0.5" title={name}>
                  <input
                    type="checkbox"
                    checked={!!indepChecked[name]}
                    onChange={(e) => onIndepChange(e, name)}
                  />
                  <span className="truncate">{name}</span>
                </label>
              ))}
              {independents.length === 0 && (
                <div className="text-gray-500 text-xs">独立変数を追加してください</div>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <BaseButton onClick={handleAddIndependent} label={<>追加 →</>} />
              <BaseButton onClick={handleRemoveIndependent} label={<>← 削除</>} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegressionVariableSelector;
