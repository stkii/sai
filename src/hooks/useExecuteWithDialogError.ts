import { useCallback } from 'react';

interface Args {
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  showAnalysisError: (text: string) => Promise<void>;
}

export const useExecuteWithDialogError = ({ setLoading, setError, showAnalysisError }: Args) => {
  return useCallback(
    async (task: () => Promise<void>) => {
      setLoading(true);
      setError(null);
      try {
        await task();
      } catch (error: unknown) {
        await showAnalysisError(error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading, showAnalysisError]
  );
};
