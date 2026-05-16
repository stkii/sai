import { Box, Button, HStack, NativeSelect, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { VariablePicker } from '../../ui/VariablePicker';
import type { ModalProps } from '../contracts';

export function RegressionModal({ headers, busy, onCancel, onExecute }: ModalProps) {
  const [dependent, setDependent] = useState<string>('');
  const [predictors, setPredictors] = useState<string[]>([]);

  function handleSubmit() {
    if (!dependent || predictors.length === 0) return;
    onExecute(predictors, { dependent });
  }

  return (
    <VStack align="stretch" gap={3}>
      <Box>
        <Text fontSize="xs" mb={1} color="gray.700">
          目的変数
        </Text>
        <NativeSelect.Root size="sm">
          <NativeSelect.Field
            value={dependent}
            onChange={(e) => {
              const v = e.currentTarget.value;
              setDependent(v);
              setPredictors((prev) => prev.filter((p) => p !== v));
            }}
          >
            <option value="">-- 選択 --</option>
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Box>
      <Box>
        <Text fontSize="xs" mb={1} color="gray.700">
          説明変数 (複数選択可)
        </Text>
        <VariablePicker
          headers={headers}
          selected={predictors}
          exclude={dependent ? [dependent] : []}
          onChange={setPredictors}
        />
      </Box>
      <HStack justify="flex-end" gap={2}>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          キャンセル
        </Button>
        <Button
          size="sm"
          colorPalette="blue"
          onClick={handleSubmit}
          loading={busy}
          disabled={!dependent || predictors.length === 0}
        >
          実行
        </Button>
      </HStack>
    </VStack>
  );
}
