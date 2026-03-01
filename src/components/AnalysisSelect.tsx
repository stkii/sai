import { useMemo } from 'react';
import type { SupportedAnalysisType } from '../types';
import BasePopoverList from './BasePopoverList';

interface AnalysisSelectItem {
  label: string;
  value: SupportedAnalysisType;
}

interface Props {
  items: ReadonlyArray<AnalysisSelectItem>;
  disabled?: boolean;
  resetKey?: number;
  onSelect: (key: SupportedAnalysisType | null) => void;
}

const AnalysisSelect = ({ items, disabled = false, resetKey, onSelect }: Props) => {
  const contents = useMemo(() => items.map((item) => ({ label: item.label, value: item.value })), [items]);
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
        onSelect(
          keySet.has(item.value as SupportedAnalysisType) ? (item.value as SupportedAnalysisType) : null
        );
      }}
    />
  );
};

export default AnalysisSelect;
