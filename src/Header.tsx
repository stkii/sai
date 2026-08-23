import { Box, HStack } from '@chakra-ui/react';
import { MethodSelector } from './analysis/ui/MethodSelector';
import { useDataset } from './data/state/DatasetContext';
import { DatasetButton } from './data/ui/DatasetButton';
import { VariableBuilderMenu } from './data/ui/VariableBuilderMenu';
import type { Method } from './shared/types';

interface Props {
  onSelectMethod: (method: Method) => void;
}

export function Header({ onSelectMethod }: Props) {
  const { dataset } = useDataset();
  const hasDataset = Boolean(dataset);

  return (
    <Box
      as="header"
      height="56px"
      borderBottomWidth="1px"
      borderColor="border"
      bg="bg.panel"
      px={4}
    >
      <HStack height="100%" gap={3}>
        <DatasetButton />
        <MethodSelector hasDataset={hasDataset} onSelect={onSelectMethod} />
        <VariableBuilderMenu />
      </HStack>
    </Box>
  );
}
