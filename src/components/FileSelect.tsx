import { Button, HStack, Text } from '@chakra-ui/react';

interface Props {
  selectedPath: string | null;
  onPick: () => void;
  buttonLabel?: string;
  placeholder?: string;
}

const FileSelect = ({
  selectedPath,
  onPick,
  buttonLabel = 'ファイルを選択',
  placeholder = 'ファイル未選択',
}: Props) => {
  return (
    <HStack gap="3">
      <Button onClick={onPick} size="sm" variant="outline">
        {buttonLabel}
      </Button>
      <Text color="gray.600" fontSize="sm" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
        {selectedPath ?? placeholder}
      </Text>
    </HStack>
  );
};

export default FileSelect;
