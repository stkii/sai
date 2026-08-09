import { Box, Flex, Tabs } from '@chakra-ui/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnalysisModalHost } from './analysis/ui/AnalysisModalHost';
import { DataPane } from './data/ui/DataPane';
import { Header } from './Header';
import { useResult } from './result/state/ResultContext';
import { HistoryPane } from './result/ui/HistoryPane';
import { ResultPane } from './result/ui/ResultPane';
import type { Method } from './shared/types';
import { PANE } from './shared/ui/golden';
import { Toaster } from './shared/ui/toaster';
import { VerticalSplitter } from './shared/ui/VerticalSplitter';

const PANE_HEADER_HEIGHT = `${PANE.headerHeight}px`;

function clampPaneWidth(width: number): number {
  return Math.max(PANE.dataMin, Math.min(PANE.dataMax, width));
}

export function App() {
  const { currentId } = useResult();
  const [activeMethod, setActiveMethod] = useState<Method | null>(null);
  const [activeTab, setActiveTab] = useState<'result' | 'history'>('result');
  const [dataWidth, setDataWidth] = useState<number>(PANE.dataDefault);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentId) setActiveTab('result');
  }, [currentId]);

  const handleResize = useCallback((clientX: number) => {
    const left = containerRef.current?.getBoundingClientRect().left ?? 0;
    setDataWidth(clampPaneWidth(clientX - left));
  }, []);

  const handleNudge = useCallback((delta: number) => {
    setDataWidth((prev) => clampPaneWidth(prev + delta));
  }, []);

  return (
    <Flex direction="column" height="100vh" width="100vw" bg="bg">
      <Header onSelectMethod={(m) => setActiveMethod(m)} />

      <Flex flex={1} overflow="hidden" ref={containerRef}>
        {/* 左ペイン: データ (常時表示) */}
        <Box width={`${dataWidth}px`} flexShrink={0}>
          <DataPane />
        </Box>

        {/* スプリッタ: ドラッグ / 矢印キーで左右リサイズ */}
        <VerticalSplitter
          onResize={handleResize}
          onNudge={handleNudge}
          value={dataWidth}
          min={PANE.dataMin}
          max={PANE.dataMax}
        />

        {/* 中央ペイン: 結果 / 履歴タブ */}
        <Box flex={1} minWidth={0}>
          <Tabs.Root
            value={activeTab}
            onValueChange={(d) => setActiveTab(d.value as 'result' | 'history')}
            height="100%"
            display="flex"
            flexDirection="column"
          >
            {/* 高さは左ペインの「データ」見出しと揃え、下線を一直線にする */}
            <Tabs.List px={2} h={PANE_HEADER_HEIGHT}>
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
      </Flex>

      <AnalysisModalHost method={activeMethod} onClose={() => setActiveMethod(null)} />
      <Toaster />
    </Flex>
  );
}
