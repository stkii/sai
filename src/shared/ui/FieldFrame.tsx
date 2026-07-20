import { Box, type BoxProps, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface Props extends Omit<BoxProps, 'children'> {
  label: string;
  children: ReactNode;
}

/** モーダル内の入力グループを枠で囲む共通フレーム。 */
export function FieldFrame({ label, children, ...rest }: Props) {
  return (
    <Box
      role="group"
      aria-label={label}
      borderWidth="1px"
      borderRadius="md"
      borderColor="border"
      px={3}
      py={2}
      {...rest}
    >
      <Text fontSize="xs" mb={2} color="fg.muted" fontWeight="medium">
        {label}
      </Text>
      {children}
    </Box>
  );
}
