import { Box, Center, Heading, HStack, IconButton, Text, VStack } from '@chakra-ui/react';
import { LuX } from 'react-icons/lu';

interface Props {
  onClose: () => void;
}

export function ChatPane({ onClose }: Props) {
  return (
    <Box height="100%" bg="bg.panel" borderLeftWidth="1px" borderColor="border">
      <VStack height="100%" align="stretch" gap={0}>
        <HStack px={3} py={2} borderBottomWidth="1px" borderColor="border" justify="space-between">
          <Heading as="h2" size="sm" fontWeight="semibold">
            <span aria-hidden="true">🤖 </span>AI チャット
          </Heading>
          <IconButton aria-label="AI チャットを閉じる" size="xs" variant="ghost" onClick={onClose}>
            <LuX />
          </IconButton>
        </HStack>
        <Center flex={1}>
          <Text fontSize="sm" color="fg.subtle">
            AI 機能は未実装 (Phase 4)
          </Text>
        </Center>
      </VStack>
    </Box>
  );
}
