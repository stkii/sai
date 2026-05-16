import { Box, Center, HStack, IconButton, Text, VStack } from '@chakra-ui/react';

interface Props {
  onClose: () => void;
}

export function ChatPane({ onClose }: Props) {
  return (
    <Box height="100%" bg="white" borderLeftWidth="1px" borderColor="gray.200">
      <VStack height="100%" align="stretch" gap={0}>
        <HStack
          px={3}
          py={2}
          borderBottomWidth="1px"
          borderColor="gray.200"
          justify="space-between"
        >
          <Text fontSize="sm" fontWeight="semibold" color="gray.700">
            🤖 AI チャット
          </Text>
          <IconButton aria-label="閉じる" size="xs" variant="ghost" onClick={onClose}>
            ×
          </IconButton>
        </HStack>
        <Center flex={1}>
          <Text fontSize="sm" color="gray.400">
            AI 機能は未実装 (Phase 4)
          </Text>
        </Center>
      </VStack>
    </Box>
  );
}
