import { Box, type BoxProps, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface Props extends Omit<BoxProps, 'children'> {
  label: string;
  children: ReactNode;
}

export function FieldFrame({ label, children, ...rest }: Props) {
  return (
    <Box borderWidth="1px" borderRadius="md" borderColor="gray.200" px={3} py={2} {...rest}>
      <Text fontSize="xs" mb={2} color="gray.600" fontWeight="medium">
        {label}
      </Text>
      {children}
    </Box>
  );
}
