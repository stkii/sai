import { message } from '@tauri-apps/plugin-dialog';
import { useCallback } from 'react';

type SetError = (value: string | null) => void;

export const useDialogError = (setError: SetError) => {
  const showValidationError = useCallback(
    async (text: string) => {
      setError(text);
      await message(text, { title: '入力エラー', kind: 'error' });
    },
    [setError]
  );

  const showAnalysisError = useCallback(
    async (text: string) => {
      setError(text);
      await message(text, { title: '分析エラー', kind: 'error' });
    },
    [setError]
  );

  return { showValidationError, showAnalysisError };
};
