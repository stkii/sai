import { Box, Center, HStack, Text, VStack } from '@chakra-ui/react';
import { PANE } from '../../shared/ui/golden';
import { useDataset } from '../state/DatasetContext';
import { DataPreview } from './DataPreview';

export function DataPane() {
  const { summary } = useDataset();

  return (
    <Box height="100%" bg="bg.subtle" borderRightWidth="1px" borderColor="border">
      <VStack height="100%" align="stretch" gap={0}>
        {/* 高さは中央ペインの Tabs.List と揃え、下線を一直線にする */}
        <HStack
          px={3}
          h={`${PANE.headerHeight}px`}
          borderBottomWidth="1px"
          borderColor="border"
          bg="bg.panel"
        >
          <Text as="h2" fontSize="sm" fontWeight="semibold">
            データ
          </Text>
        </HStack>
        {summary ? (
          <DataPreview summary={summary} />
        ) : (
          <Center flex={1} px={4}>
            <Text fontSize="sm" color="fg.subtle" textAlign="center">
              ヘッダの「データセットを開く」から
              <br />
              CSV / XLSX を読み込んでください
            </Text>
          </Center>
        )}
      </VStack>
    </Box>
  );
}
