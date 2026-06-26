import { Box, Center, Text, VStack } from '@chakra-ui/react';
import { useDataset } from '../state/DatasetContext';
import { DataPreview } from './DataPreview';

export function DataPane() {
  const { summary } = useDataset();

  return (
    <Box height="100%" bg="gray.50" borderRightWidth="1px" borderColor="gray.200">
      <VStack height="100%" align="stretch" gap={0}>
        {/* 高さは中央ペインの Tabs.List (40px) と揃え、下線を一直線にする */}
        <Box
          px={3}
          h="40px"
          display="flex"
          alignItems="center"
          borderBottomWidth="1px"
          borderColor="gray.200"
          bg="white"
        >
          <Text fontSize="sm" fontWeight="semibold" color="gray.700">
            データ
          </Text>
        </Box>
        {summary ? (
          <DataPreview summary={summary} />
        ) : (
          <Center flex={1} px={4}>
            <Text fontSize="sm" color="gray.400" textAlign="center">
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
