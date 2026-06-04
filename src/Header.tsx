import { Box, Button, HStack, Text } from '@chakra-ui/react';
import { MethodSelector } from './analysis/ui/MethodSelector';
import { useDataset } from './data/state/DatasetContext';
import { DatasetButton } from './data/ui/DatasetButton';
import type { Method } from './shared/types';

interface Props {
  isAIOpen: boolean;
  onToggleAI: () => void;
  onSelectMethod: (method: Method) => void;
}

export function Header({ isAIOpen, onToggleAI, onSelectMethod }: Props) {
  const { summary } = useDataset();
  const hasDataset = Boolean(summary);

  return (
    <Box
      as="header"
      height="56px"
      borderBottomWidth="1px"
      borderColor="gray.200"
      bg="white"
      px={4}
    >
      <HStack height="100%" justify="space-between">
        <HStack gap={3}>
          <Text fontWeight="bold" fontSize="lg">
            SAI
          </Text>
          <DatasetButton />
          <MethodSelector hasDataset={hasDataset} onSelect={onSelectMethod} />
        </HStack>
        <HStack gap={2}>
          <Button
            size="sm"
            variant={isAIOpen ? 'solid' : 'outline'}
            colorPalette="purple"
            onClick={onToggleAI}
          >
            🤖 AI
          </Button>
          <Button size="sm" variant="ghost" disabled>
            設定
          </Button>
        </HStack>
      </HStack>
    </Box>
  );
}
