import { useState } from 'react';

// AI ペインの開閉状態のみを扱うローカル state フック (共有 store ではない)。
// App が 1 回だけ呼んで配る前提。Phase 4 で会話履歴・送信中状態などを
// 扱う際に、共有が必要なら Context 等の実際の store へ昇格させる。
export function useAIPaneState() {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((v) => !v),
  };
}
