import { Box, HStack, Separator, Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface FormattedOption {
  label: string;
  value: string;
}

interface AnalysisLogDetailProps {
  datasetLabel: string | null;
  formattedOptions: FormattedOption[];
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

        <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p="3">
          <Stack gap="2">
            <Text fontWeight="semibold" fontSize="sm">
              分析条件
            </Text>
            <Stack gap="1">
              <HStack gap="2" fontSize="sm">
                <Text color="gray.500" flexShrink={0}>
                  データ:
                </Text>
                <Text>{datasetLabel ?? '不明'}</Text>
              </HStack>
              <HStack gap="2" fontSize="sm">
                <Text color="gray.500" flexShrink={0}>
                  変数:
                </Text>
                <Text>{variablesLabel}</Text>
              </HStack>
              {formattedOptions.map((opt) => (
                <HStack key={opt.label} gap="2" fontSize="sm">
                  <Text color="gray.500" flexShrink={0}>
                    {opt.label}:
                  </Text>
                  <Text>{opt.value}</Text>
                </HStack>
              ))}
            </Stack>
          </Stack>
        </Box>

        <Separator />
        {children}
      </Stack>
    </Box>
  );
};
