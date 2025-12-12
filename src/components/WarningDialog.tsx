import type { FC } from 'react';

import BaseButton from './BaseButton';

type Props = {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
};

const WarningDialog: FC<Props> = ({ isOpen, title, message, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-sm">
        {title && <h2 className="text-lg font-semibold mb-2">{title}</h2>}
        <p className="text-sm mb-4 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end">
          <BaseButton onClick={onClose} label={<>OK</>} className="text-sm" />
        </div>
      </div>
    </div>
  );
};

export default WarningDialog;
