import { Box, Separator, Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface AnalysisLogDetailProps {
  datasetLabel: string | null;
  formattedOptions: string;
  sourceLabel: string;
  timestamp: string | null;
  variablesLabel: string;
  children: ReactNode;
}

export const AnalysisLogDetail = ({
  datasetLabel,
  formattedOptions,
  sourceLabel,
  timestamp,
  variablesLabel,
  children,
}: AnalysisLogDetailProps) => {
  return (
    <Box flex="1" borderWidth="1px" borderColor="gray.200" borderRadius="md" p="4" overflow="auto">
      <Stack gap="3">
        <Stack gap="1">
          <Text color="gray.500" fontSize="sm">
            {sourceLabel}
            {timestamp ? ` / ${timestamp}` : ''}
          </Text>
        </Stack>

        <Stack gap="1">
          <Text color="gray.600" fontSize="sm">
            データ: {datasetLabel ?? '不明'}
          </Text>
          <Text color="gray.600" fontSize="sm">
            変数: {variablesLabel}
          </Text>
        </Stack>

        <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p="3">
          <Stack gap="2">
            <Text fontWeight="semibold" fontSize="sm">
              分析条件
            </Text>
            <Box
              as="pre"
              bg="gray.50"
              borderRadius="md"
              p="3"
              overflowX="auto"
              fontSize="xs"
              whiteSpace="pre-wrap"
            >
              {formattedOptions}
            </Box>
          </Stack>
        </Box>

        <Separator />
        {children}
      </Stack>
    </Box>
  );
};
