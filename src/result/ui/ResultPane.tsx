import { Box, Center, Text, VStack } from '@chakra-ui/react';
import { findMethod } from '../../analysis/methods';
import { SectionsView } from '../../shared/ui/SectionsView';
import { useResult } from '../state/ResultContext';
import { ResultMetadata } from './ResultMetadata';

export function ResultPane() {
  const { current } = useResult();
  if (!current) {
    return (
      <Box height="100%" px={4} py={3}>
        <Center height="100%">
          <Text fontSize="sm" color="gray.400">
            分析結果はここに表示されます
          </Text>
        </Center>
      </Box>
    );
  }
  const mod = findMethod(current.method);
  return (
    <Box key={current.id} height="100%" px={4} py={3} overflow="auto">
      <VStack align="stretch" gap={3}>
        <ResultMetadata entry={current} />
        {mod ? (
          (mod.renderResult ?? ((r) => <SectionsView result={r} />))(current.result)
        ) : (
          <Text fontSize="sm" color="red.500">
            未対応のメソッド: {current.method}
          </Text>
        )}
      </VStack>
    </Box>
  );
}
