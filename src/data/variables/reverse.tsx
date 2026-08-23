import { Box, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { FieldFrame } from '../../shared/ui/FieldFrame';
import { type Choice, NumberField, RadioChoices, TextField } from '../../shared/ui/fields';
import { GoldenSplit } from '../../shared/ui/GoldenSplit';
import { ModalActions } from '../../shared/ui/ModalActions';
import { VariablePicker } from '../../shared/ui/VariablePicker';
import type { VariableModalProps, VariableModule } from './contracts';

/** 変換例の表示上限。多いと枠が縦に伸びて他の入力を押し出すため。 */
const PREVIEW_LIMIT = 3;

type NameMode = 'suffix' | 'custom';

const NAME_MODES: Choice<NameMode>[] = [
  { value: 'suffix', label: '接尾辞' },
  { value: 'custom', label: '任意の変数名' },
];

function previewNames(sources: string[], suffix: string): string {
  const shown = sources.slice(0, PREVIEW_LIMIT).map((s) => `${s} → ${s}${suffix}`);
  const rest = sources.length - shown.length;
  return rest > 0 ? `${shown.join('、')} 他 ${rest} 件` : shown.join('、');
}

export function ReverseItemsModal({ headers, busy, onCancel, onSubmit }: VariableModalProps) {
  const [sources, setSources] = useState<string[]>([]);
  const [nameMode, setNameMode] = useState<NameMode>('suffix');
  const [suffix, setSuffix] = useState('_R');
  // 選択が変わっても入力済みの名前を捨てないよう、元の列名をキーに持つ
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  // 尺度の範囲に既定値は置かない。5件法を仮定して埋めておくと、7件法のデータで
  // 上位2件が偶然使われていない場合に誤った反転が素通りする
  const [scaleMin, setScaleMin] = useState<number | undefined>();
  const [scaleMax, setScaleMax] = useState<number | undefined>();

  const trimmedSuffix = suffix.trim();
  const names =
    nameMode === 'suffix'
      ? sources.map((s) => `${s}${trimmedSuffix}`)
      : sources.map((s) => (customNames[s] ?? '').trim());

  const namesValid = nameMode === 'suffix' ? trimmedSuffix !== '' : names.every((n) => n !== '');
  const rangeValid = scaleMin !== undefined && scaleMax !== undefined && scaleMin < scaleMax;
  const canSubmit = sources.length > 0 && namesValid && rangeValid;

  function handleSubmit() {
    if (scaleMin === undefined || scaleMax === undefined || !canSubmit) return;
    onSubmit({ sources, names, scaleMin, scaleMax });
  }

  return (
    <VStack align="stretch" gap={4}>
      <GoldenSplit
        primary={
          <FieldFrame label="逆転する項目">
            <VariablePicker headers={headers} selected={sources} onChange={setSources} />
          </FieldFrame>
        }
        secondary={
          <VStack align="stretch" gap={3}>
            <FieldFrame label="尺度の範囲">
              <VStack align="stretch" gap={2}>
                <SimpleGrid columns={2} gap={3}>
                  <NumberField label="最小値" value={scaleMin} onChange={setScaleMin} />
                  <NumberField label="最大値" value={scaleMax} onChange={setScaleMax} />
                </SimpleGrid>
                <Text fontSize="xs" color="fg.muted">
                  選択したすべての項目に同じ範囲を適用します。範囲が異なる項目は分けて作成してください。
                </Text>
              </VStack>
            </FieldFrame>
            <FieldFrame label="新しい変数名">
              <VStack align="stretch" gap={2}>
                <RadioChoices options={NAME_MODES} value={nameMode} onChange={setNameMode} />
                {nameMode === 'suffix' ? (
                  <>
                    <TextField
                      label="接尾辞"
                      value={suffix}
                      onChange={setSuffix}
                      placeholder="_R"
                    />
                    {sources.length > 0 && trimmedSuffix !== '' && (
                      <Text fontSize="xs" color="fg.muted">
                        {previewNames(sources, trimmedSuffix)}
                      </Text>
                    )}
                  </>
                ) : sources.length === 0 ? (
                  <Text fontSize="xs" color="fg.muted">
                    逆転する項目を選ぶと入力欄が並びます。
                  </Text>
                ) : (
                  // 項目が多いと枠が縦に伸びて実行ボタンを押し出すため、ここだけスクロールさせる
                  <Box maxHeight="233px" overflowY="auto" pr={1}>
                    <VStack align="stretch" gap={2}>
                      {sources.map((s) => (
                        <TextField
                          key={s}
                          label={s}
                          value={customNames[s] ?? ''}
                          onChange={(v) => setCustomNames((prev) => ({ ...prev, [s]: v }))}
                          placeholder="新しい列名"
                        />
                      ))}
                    </VStack>
                  </Box>
                )}
              </VStack>
            </FieldFrame>
          </VStack>
        }
      />
      <ModalActions
        busy={busy}
        disabled={!canSubmit}
        submitLabel="作成"
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </VStack>
  );
}

export const reverseModule: VariableModule = {
  definition: { key: 'reverse', label: '逆転' },
  renderModal: (props) => <ReverseItemsModal {...props} />,
};
