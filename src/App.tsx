import { Box, Flex, Tabs } from '@chakra-ui/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAIChatStore } from './ai/state/useAIChatStore';
import { ChatPane } from './ai/ui/ChatPane';
import { AnalysisModalHost } from './analysis/ui/AnalysisModalHost';
import { DataPane } from './data/ui/DataPane';
import { Header } from './Header';
import { useResult } from './result/state/ResultContext';
import { HistoryPane } from './result/ui/HistoryPane';
import { ResultPane } from './result/ui/ResultPane';
import type { Method } from './shared/types';
import { VerticalSplitter } from './shared/ui/VerticalSplitter';

const DATA_PANE_DEFAULT = 320;
const DATA_PANE_MIN = 200;
const DATA_PANE_MAX = 640;
const AI_PANE_WIDTH = '360px';

export function App() {
  const ai = useAIChatStore();
  const { currentId } = useResult();
  const [activeMethod, setActiveMethod] = useState<Method | null>(null);
  const [activeTab, setActiveTab] = useState<'result' | 'history'>('result');
  const [dataWidth, setDataWidth] = useState(DATA_PANE_DEFAULT);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentId) setActiveTab('result');
  }, [currentId]);

  const handleResize = useCallback((clientX: number) => {
    const left = containerRef.current?.getBoundingClientRect().left ?? 0;
    const next = clientX - left;
    setDataWidth(Math.max(DATA_PANE_MIN, Math.min(DATA_PANE_MAX, next)));
  }, []);

  return (
    <Flex direction="column" height="100vh" width="100vw" bg="white">
      <Header
        isAIOpen={ai.isOpen}
        onToggleAI={ai.toggle}
        onSelectMethod={(m) => setActiveMethod(m)}
      />

      <Flex flex={1} overflow="hidden" ref={containerRef}>
        {/* 左ペイン: データ (常時表示) */}
        <Box width={`${dataWidth}px`} flexShrink={0}>
          <DataPane />
        </Box>

        {/* スプリッタ: ホバーで左右リサイズ */}
        <VerticalSplitter onResize={handleResize} />

        {/* 中央ペイン: 結果 / 履歴タブ */}
        <Box flex={1} minWidth={0}>
          <Tabs.Root
            value={activeTab}
            onValueChange={(d) => setActiveTab(d.value as 'result' | 'history')}
            height="100%"
            display="flex"
            flexDirection="column"
          >
            <Tabs.List px={2}>
              <Tabs.Trigger value="result">結果</Tabs.Trigger>
              <Tabs.Trigger value="history">履歴</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="result" flex={1} p={0} overflow="auto">
              <ResultPane />
            </Tabs.Content>
            <Tabs.Content value="history" flex={1} p={0} overflow="auto">
              <HistoryPane />
            </Tabs.Content>
          </Tabs.Root>
        </Box>

        {/* 右ペイン: AI チャット (オンデマンド・スライドイン) */}
        <Box
          width={ai.isOpen ? AI_PANE_WIDTH : '0'}
          flexShrink={0}
          overflow="hidden"
          transition="width 0.2s ease"
        >
          <Box width={AI_PANE_WIDTH} height="100%">
            <ChatPane onClose={ai.close} />
          </Box>
        </Box>
      </Flex>

      <AnalysisModalHost method={activeMethod} onClose={() => setActiveMethod(null)} />
    </Flex>
  );
}
