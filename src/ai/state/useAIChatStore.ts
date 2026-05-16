import { useState } from 'react';

// Phase 2: 開閉状態のみ管理。
// Phase 4 で会話履歴・送信中状態などを追加する。
export function useAIChatStore() {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((v) => !v),
  };
}
