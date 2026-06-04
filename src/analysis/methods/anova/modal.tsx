import { Box, Button, HStack, NativeSelect, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { VariablePicker } from '../../ui/VariablePicker';
import type { ModalProps } from '../contracts';

type Design = 'between' | 'within';

interface AnovaOptions {
  dependent: string;
  factors: string[];
  design: Design;
  subject?: string;
}

export function AnovaModal({ headers, busy, onCancel, onExecute }: ModalProps) {
  const [dependent, setDependent] = useState<string>('');
  const [factors, setFactors] = useState<string[]>([]);
  const [design, setDesign] = useState<Design>('between');
  const [subject, setSubject] = useState<string>('');

  function handleSubmit() {
    if (!dependent || factors.length === 0) return;
    if (design === 'within' && !subject) return;
    const options: AnovaOptions = { dependent, factors, design };
    if (design === 'within') options.subject = subject;
    onExecute([dependent, ...factors], options as unknown as Record<string, unknown>);
  }

  return (
    <VStack align="stretch" gap={3}>
      <Box>
        <Text fontSize="xs" mb={1} color="gray.700">
          デザイン
        </Text>
        <NativeSelect.Root size="sm">
          <NativeSelect.Field
            value={design}
            onChange={(e) => setDesign(e.currentTarget.value as Design)}
          >
            <option value="between">被験者間 (between)</option>
            <option value="within">反復測定 (within)</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Box>
      <Box>
        <Text fontSize="xs" mb={1} color="gray.700">
          従属変数 (数値)
        </Text>
        <NativeSelect.Root size="sm">
          <NativeSelect.Field
            value={dependent}
            onChange={(e) => setDependent(e.currentTarget.value)}
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
          要因 (因子, 複数選択可)
        </Text>
        <VariablePicker
          headers={headers}
          selected={factors}
          exclude={[dependent, subject].filter(Boolean)}
          onChange={setFactors}
        />
      </Box>
      {design === 'within' && (
        <Box>
          <Text fontSize="xs" mb={1} color="gray.700">
            被験者ID列
          </Text>
          <NativeSelect.Root size="sm">
            <NativeSelect.Field
              value={subject}
              onChange={(e) => setSubject(e.currentTarget.value)}
            >
              <option value="">-- 選択 --</option>
              {headers
                .filter((h) => h !== dependent && !factors.includes(h))
                .map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
      )}
      <HStack justify="flex-end" gap={2}>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          キャンセル
        </Button>
        <Button
          size="sm"
          colorPalette="blue"
          onClick={handleSubmit}
          loading={busy}
          disabled={!dependent || factors.length === 0 || (design === 'within' && !subject)}
        >
          実行
        </Button>
      </HStack>
    </VStack>
  );
}
