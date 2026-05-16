import { Button, HStack, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { VariablePicker } from '../../ui/VariablePicker';
import type { ModalProps } from '../contracts';

export function ReliabilityModal({ headers, busy, onCancel, onExecute }: ModalProps) {
  const [selected, setSelected] = useState<string[]>([]);

  function handleSubmit() {
    if (selected.length < 2) return;
    onExecute(selected, {});
  }

  return (
    <VStack align="stretch" gap={3}>
      <Text fontSize="sm" color="gray.600">
        尺度を構成する項目 (2つ以上) を選択してください
      </Text>
      <VariablePicker headers={headers} selected={selected} onChange={setSelected} />
      <HStack justify="flex-end" gap={2}>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          キャンセル
        </Button>
        <Button
          size="sm"
          colorPalette="blue"
          onClick={handleSubmit}
          loading={busy}
          disabled={selected.length < 2}
        >
          実行
        </Button>
      </HStack>
    </VStack>
  );
}
