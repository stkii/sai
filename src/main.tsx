import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { DatasetProvider } from './data/state/DatasetContext';
import { ResultProvider } from './result/state/ResultContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ChakraProvider value={defaultSystem}>
      <DatasetProvider>
        <ResultProvider>
          <App />
        </ResultProvider>
      </DatasetProvider>
    </ChakraProvider>
  </React.StrictMode>
);
