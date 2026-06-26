import { Box, Flex } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { GOLDEN_SPLIT } from './golden';

interface Props {
  /** 主要領域 (黄金比の大きい方・約 61.8%)。変数選択など中心的な操作 */
  primary: ReactNode;
  /** 補助領域 (小さい方・約 38.2%)。オプション選択など従属的な操作 */
  secondary: ReactNode;
}

/**
 * モーダル内の 2 カラムを黄金比 (φ : 1) で分割する共通レイアウト。
 * flex-basis 0 の grow 比で割るため、モーダル幅が変わっても比率は保たれる。
 * 補助領域は最小幅で下限を守り、極端に狭い画面でも操作要素が潰れない。
 */
export function GoldenSplit({ primary, secondary }: Props) {
  return (
    <Flex gap={5} align="stretch">
      <Box flex={GOLDEN_SPLIT.major} minW={0}>
        {primary}
      </Box>
      <Box flex={GOLDEN_SPLIT.minor} minW="220px">
        {secondary}
      </Box>
    </Flex>
  );
}
