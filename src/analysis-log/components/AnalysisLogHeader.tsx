import { Button, Flex, HStack, Text } from '@chakra-ui/react';
import { LOG_SOURCE_LABEL, type LogSource } from '../types';

interface AnalysisLogHeaderProps {
  availableSources: readonly LogSource[];
  sessionUpdateCount: number;
  source: LogSource;
  sourceDescription: string;
  title: string;
  onChangeSource: (source: LogSource) => void;
}

export const AnalysisLogHeader = ({
  availableSources,
  sessionUpdateCount,
  source,
  sourceDescription,
  title,
  onChangeSource,
}: AnalysisLogHeaderProps) => {
  return (
    <Flex align={{ base: 'stretch', md: 'center' }} justify="space-between" gap="3" wrap="wrap">
      {availableSources.length > 1 ? (
        <HStack gap="2">
          {availableSources.map((item) => (
            <Button
              key={item}
              variant={source === item ? 'solid' : 'outline'}
              size="sm"
              onClick={() => onChangeSource(item)}
            >
              {LOG_SOURCE_LABEL[item]}
              {item === 'session' && sessionUpdateCount > 0 ? ` (${sessionUpdateCount})` : ''}
            </Button>
          ))}
        </HStack>
      ) : (
        <Text fontWeight="semibold">{title}</Text>
      )}
      <Text color="gray.600" fontSize="sm">
        {sourceDescription}
      </Text>
    </Flex>
  );
};
