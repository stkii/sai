import { type FC, useId, useMemo, useState } from 'react';
import type { RegressionInteraction } from '../types';
import BaseButton from './BaseButton';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  variables: string[];
  interactions: RegressionInteraction[];
  onChange: (ints: RegressionInteraction[]) => void;
};

const RegressionInteractionDialog: FC<Props> = ({ isOpen, onClose, variables, interactions, onChange }) => {
  const [left, setLeft] = useState<string>('');
  const [right, setRight] = useState<string>('');
  const [label, setLabel] = useState<string>('');

  const leftId = useId();
  const rightId = useId();
  const labelId = useId();

  const availableRight = useMemo(() => variables.filter((v) => v !== left), [variables, left]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!left || !right || left === right) return;
    const baseLabel = label && label.trim().length > 0 ? label.trim() : `${left}*${right}`;
    const exists = interactions.some(
      (it) =>
        ((it.left === left && it.right === right) || (it.left === right && it.right === left)) &&
        it.label === baseLabel
    );
    if (exists) return;
    const next: RegressionInteraction = {
      left,
      right,
      label: baseLabel,
    };
    onChange([...interactions, next]);
    setLabel('');
  };

  const handleRemove = (idx: number) => {
    const next = interactions.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">交互作用の編集</h2>
        <p className="text-xs text-gray-600 mb-3">
          選択した変数の組み合わせから交互作用項を作成します。元データのシートは変更されません。
        </p>

        <div className="mb-3">
          <h3 className="text-sm font-semibold mb-1">追加済みの交互作用</h3>
          <div className="border rounded-md p-2 max-h-40 overflow-auto text-sm">
            {interactions.length === 0 && (
              <div className="text-gray-500 text-xs">交互作用はまだ追加されていません</div>
            )}
            {interactions.map((it, idx) => (
              <div
                key={`${it.left}-${it.right}-${idx}`}
                className="flex items-center justify-between gap-2 py-0.5"
              >
                <div className="flex flex-col">
                  <span className="font-medium truncate" title={it.label}>
                    {it.label}
                  </span>
                  <span className="text-xs text-gray-600">
                    ({it.left} × {it.right})
                  </span>
                </div>
                <BaseButton
                  onClick={() => handleRemove(idx)}
                  label={<>削除</>}
                  className="text-xs px-2 py-1"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <h3 className="text-sm font-semibold mb-1">新しい交互作用を追加</h3>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1" htmlFor={leftId}>
                  変数1
                </label>
                <select
                  id={leftId}
                  className="w-full border rounded-md px-2 py-1 text-sm"
                  value={left}
                  onChange={(e) => setLeft(e.target.value)}
                >
                  <option value="">選択してください</option>
                  {variables.map((v) => (
                    <option key={`left-${v}`} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1" htmlFor={rightId}>
                  変数2
                </label>
                <select
                  id={rightId}
                  className="w-full border rounded-md px-2 py-1 text-sm"
                  value={right}
                  onChange={(e) => setRight(e.target.value)}
                >
                  <option value="">選択してください</option>
                  {availableRight.map((v) => (
                    <option key={`right-${v}`} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1" htmlFor={labelId}>
                ラベル（任意、未入力なら「変数1*変数2」）
              </label>
              <input
                type="text"
                id={labelId}
                className="w-full border rounded-md px-2 py-1 text-sm"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="flex justify-end mt-1">
              <BaseButton onClick={handleAdd} label={<>交互作用を追加</>} className="text-sm" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <BaseButton onClick={onClose} label={<>閉じる</>} className="text-sm" />
        </div>
      </div>
    </div>
  );
};

export default RegressionInteractionDialog;
