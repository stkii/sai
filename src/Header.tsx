import { Box, Button, Heading, HStack } from '@chakra-ui/react';
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
      borderColor="border"
      bg="bg.panel"
      px={4}
    >
      <HStack height="100%" justify="space-between">
        <HStack gap={3}>
          <Heading as="h1" size="lg" fontWeight="bold">
            SAI
          </Heading>
          <DatasetButton />
          <MethodSelector hasDataset={hasDataset} onSelect={onSelectMethod} />
        </HStack>
        <HStack gap={2}>
          <Button
            size="sm"
            variant={isAIOpen ? 'solid' : 'outline'}
            colorPalette="purple"
            aria-pressed={isAIOpen}
            onClick={onToggleAI}
          >
            <span aria-hidden="true">🤖 </span>AI
          </Button>
          <Button size="sm" variant="ghost" disabled>
            設定
          </Button>
        </HStack>
      </HStack>
    </Box>
  );
}
