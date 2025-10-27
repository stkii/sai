import type { FC } from 'react';

import BaseButton from './BaseButton';

type Props = {
  onRun: () => void;
  onClose: () => void;
  running?: boolean;
  disabled?: boolean;
  className?: string;
};

const RunField: FC<Props> = ({ onRun, onClose, running, disabled, className }) => {
  return (
    <div className={['flex justify-center items-center gap-8', className || ''].filter(Boolean).join(' ')}>
      <BaseButton
        widthGroup="analysis-primary"
        onClick={onRun}
        disabled={disabled}
        label={running ? '実行中…' : '実行'}
      />
      <BaseButton
        widthGroup="analysis-secondary"
        onClick={onClose}
        className="text-red-600 hover:bg-red-50"
        label="✕ 終了"
      />
    </div>
  );
};

export default RunField;
