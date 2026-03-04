import { useEffect, useEffectEvent } from 'react';

interface Args {
  open: boolean;
  variables?: string[];
  resetOnClose: () => void;
  resetOnVariablesChange?: () => void;
}

export const useModalReset = ({ open, variables, resetOnClose, resetOnVariablesChange }: Args) => {
  const handleResetOnClose = useEffectEvent(resetOnClose);
  const handleResetOnVariablesChange = useEffectEvent(() => {
    resetOnVariablesChange?.();
  });

  useEffect(() => {
    if (!open) {
      handleResetOnClose();
    }
  }, [open]);

  useEffect(() => {
    if (!variables || !resetOnVariablesChange) {
      return;
    }
    handleResetOnVariablesChange();
  }, [variables, resetOnVariablesChange]);
};
