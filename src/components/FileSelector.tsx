import { Button, HStack, Text } from '@chakra-ui/react';

interface FileSelectorProps {
  selectedPath: string | null;
  onPick: () => void;
  buttonLabel?: string;
  placeholder?: string;
}

const FileSelector = ({
  selectedPath,
  onPick,
  buttonLabel = 'Select file',
  placeholder = 'No file selected',
}: FileSelectorProps) => {
  return (
    <HStack gap="3">
      <Button size="sm" variant="outline" onClick={onPick}>
        {buttonLabel}
      </Button>
      <Text fontSize="sm" color="gray.600" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
        {selectedPath ?? placeholder}
      </Text>
    </HStack>
  );
};

export default FileSelector;
