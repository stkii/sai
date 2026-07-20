import { Box, Center, Text, VStack } from '@chakra-ui/react';
import { findMethod } from '../../analysis/methods';
import { SectionsView } from '../../shared/ui/SectionsView';
import { useResult } from '../state/ResultContext';
import { ResultMetadata } from './ResultMetadata';

export function ResultPane() {
  const { current } = useResult();
  if (!current) {
    return (
      <Center height="100%" px={4} py={3}>
        <Text fontSize="sm" color="fg.subtle">
          分析結果はここに表示されます
        </Text>
      </Center>
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
          <Text fontSize="sm" color="fg.error">
            未対応のメソッド: {current.method}
          </Text>
        )}
      </VStack>
    </Box>
  );
}
