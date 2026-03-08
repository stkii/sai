import { useMemo } from 'react';
import { BasePopoverList } from '../../components/BasePopoverList';
import { isSupportedAnalysisType, type SupportedAnalysisType } from '../types';

interface Item {
  label: string;
  value: SupportedAnalysisType;
}

interface Props {
  items: ReadonlyArray<Item>;
  disabled?: boolean;
  resetKey?: number;
  onSelect: (key: SupportedAnalysisType | null) => void;
}

export const MethodSelector = ({ items, disabled = false, resetKey, onSelect }: Props) => {
  const contents = useMemo(
    () => items.map((item) => ({ label: item.label, value: item.value })),
    [items]
  );
  const keySet = useMemo(() => new Set(items.map((item) => item.value)), [items]);

  return (
    <BasePopoverList
      contents={contents}
      disabled={disabled}
      placeholder="分析方法を選択"
      resetKey={resetKey}
      onSelect={(item) => {
        if (!item) {
          onSelect(null);
          return;
        }
        if (isSupportedAnalysisType(item.value) && keySet.has(item.value)) {
          onSelect(item.value);
          return;
        }
        onSelect(null);
      }}
    />
  );
};
