import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { createRoot } from 'react-dom/client';
import { AnalysisLogBrowser, type LogSource } from '../analysis-log/api';
import { RESULT_WINDOW_LABEL } from './events';
import { openHistoryWindow } from './services/toHistoryWindow';

const SESSION_SOURCES: readonly LogSource[] = ['session'];

export const ResultWindow = () => {
  return (
    <AnalysisLogBrowser
      availableSources={SESSION_SOURCES}
      defaultSource="session"
      emptyStateAction={{
        label: '過去の分析を開く',
        onClick: () => {
          void openHistoryWindow();
        },
      }}
      listenForLiveResults
      readyLabel={RESULT_WINDOW_LABEL}
      title="結果ビュー"
    />
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(
  <ChakraProvider value={defaultSystem}>
    <ResultWindow />
  </ChakraProvider>
);
