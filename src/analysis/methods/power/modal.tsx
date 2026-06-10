import { Box, Button, HStack, Input, NativeSelect, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import type { ModalProps } from '../contracts';

type TestType = 't' | 'anova' | 'prop';

// onExecute の AnalysisOptions (Record<string, unknown>) に直接代入できるよう
// interface ではなく type で定義する (interface は implicit index signature を持たない)
type CommonOptions = {
  test_type: TestType;
  sig_level: number;
};

type TTestOptions = CommonOptions & {
  test_type: 't';
  n?: number;
  effect_size?: number;
  power?: number;
  ttest_type: 'one.sample' | 'two.sample' | 'paired';
};

type AnovaOptions = CommonOptions & {
  test_type: 'anova';
  groups?: number;
  n?: number;
  between_var?: number;
  within_var?: number;
  power?: number;
};

type PropOptions = CommonOptions & {
  test_type: 'prop';
  n?: number;
  p1?: number;
  p2?: number;
  power?: number;
};

type PowerOptions = TTestOptions | AnovaOptions | PropOptions;

function NumField({
  label,
  value,
  onChange,
  step = 'any',
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: string;
}) {
  return (
    <Box>
      <Text fontSize="xs" mb={1} color="gray.700">
        {label}
      </Text>
      <Input
        size="sm"
        type="number"
        step={step}
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.currentTarget.value;
          onChange(raw === '' ? undefined : Number(raw));
        }}
      />
    </Box>
  );
}

export function PowerModal({ busy, onCancel, onExecute }: ModalProps) {
  const [testType, setTestType] = useState<TestType>('t');
  const [sigLevel, setSigLevel] = useState<number>(0.05);

  // t-test
  const [n, setN] = useState<number | undefined>();
  const [effectSize, setEffectSize] = useState<number | undefined>();
  const [power, setPower] = useState<number | undefined>(0.8);
  const [ttestType, setTtestType] = useState<TTestOptions['ttest_type']>('two.sample');

  // anova
  const [groups, setGroups] = useState<number | undefined>(3);
  const [betweenVar, setBetweenVar] = useState<number | undefined>();
  const [withinVar, setWithinVar] = useState<number | undefined>();

  // prop
  const [p1, setP1] = useState<number | undefined>();
  const [p2, setP2] = useState<number | undefined>();

  function buildOptions(): PowerOptions {
    if (testType === 't') {
      return {
        test_type: 't',
        sig_level: sigLevel,
        n,
        effect_size: effectSize,
        power,
        ttest_type: ttestType,
      };
    }
    if (testType === 'anova') {
      return {
        test_type: 'anova',
        sig_level: sigLevel,
        groups,
        n,
        between_var: betweenVar,
        within_var: withinVar,
        power,
      };
    }
    return {
      test_type: 'prop',
      sig_level: sigLevel,
      n,
      p1,
      p2,
      power,
    };
  }

  function handleSubmit() {
    onExecute([], buildOptions());
  }

  return (
    <VStack align="stretch" gap={3}>
      <Text fontSize="sm" color="gray.600">
        いずれか1つの値を空欄にして残りを埋めてください。空欄の値が解として算出されます。
      </Text>
      <Box>
        <Text fontSize="xs" mb={1} color="gray.700">
          検定の種類
        </Text>
        <NativeSelect.Root size="sm">
          <NativeSelect.Field
            value={testType}
            onChange={(e) => setTestType(e.currentTarget.value as TestType)}
          >
            <option value="t">t検定</option>
            <option value="anova">一元配置分散分析</option>
            <option value="prop">比率の差</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Box>
      <NumField label="有意水準 α" value={sigLevel} onChange={(v) => setSigLevel(v ?? 0.05)} />
      <NumField label="検出力 (1−β)" value={power} onChange={setPower} />
      <NumField label="サンプルサイズ n" value={n} onChange={setN} />

      {testType === 't' && (
        <>
          <NumField label="効果量 (delta)" value={effectSize} onChange={setEffectSize} />
          <Box>
            <Text fontSize="xs" mb={1} color="gray.700">
              t検定の種類
            </Text>
            <NativeSelect.Root size="sm">
              <NativeSelect.Field
                value={ttestType}
                onChange={(e) => setTtestType(e.currentTarget.value as TTestOptions['ttest_type'])}
              >
                <option value="one.sample">1標本</option>
                <option value="two.sample">2標本 (独立)</option>
                <option value="paired">対応あり</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>
        </>
      )}

      {testType === 'anova' && (
        <>
          <NumField label="群数 groups" value={groups} onChange={setGroups} />
          <NumField label="群間分散 between.var" value={betweenVar} onChange={setBetweenVar} />
          <NumField label="群内分散 within.var" value={withinVar} onChange={setWithinVar} />
        </>
      )}

      {testType === 'prop' && (
        <>
          <NumField label="比率1 p1" value={p1} onChange={setP1} />
          <NumField label="比率2 p2" value={p2} onChange={setP2} />
        </>
      )}

      <HStack justify="flex-end" gap={2}>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          キャンセル
        </Button>
        <Button size="sm" colorPalette="blue" onClick={handleSubmit} loading={busy}>
          実行
        </Button>
      </HStack>
    </VStack>
  );
}
