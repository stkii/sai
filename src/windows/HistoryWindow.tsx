import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { createRoot } from 'react-dom/client';
import { AnalysisLogBrowser, type LogSource } from '../analysis-log/api';

const PERSISTENT_SOURCES: readonly LogSource[] = ['persistent'];

export const HistoryWindow = () => {
  return (
    <AnalysisLogBrowser
      availableSources={PERSISTENT_SOURCES}
      defaultSource="persistent"
      title="分析履歴"
    />
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(
  <ChakraProvider value={defaultSystem}>
    <HistoryWindow />
  </ChakraProvider>
);
