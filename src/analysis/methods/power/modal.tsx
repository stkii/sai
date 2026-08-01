import { SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import type { AnalysisOptions } from '../../../shared/types';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
import { type Choice, NumberField, RadioField } from '../../../shared/ui/fields';
import { GoldenSplit } from '../../../shared/ui/GoldenSplit';
import { ModalActions } from '../../../shared/ui/ModalActions';
import { labelOf, type ModalProps } from '../contracts';

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

const TEST_TYPE_OPTIONS: Choice<TestType>[] = [
  { value: 't', label: 't検定' },
  { value: 'anova', label: '一元配置分散分析' },
  { value: 'prop', label: '比率の差' },
];

const TTEST_TYPE_OPTIONS: Choice<TTestOptions['ttest_type']>[] = [
  { value: 'one.sample', label: '1標本' },
  { value: 'two.sample', label: '2標本 (独立)' },
  { value: 'paired', label: '対応あり' },
];

// PowerOptions は判別共用体のためフィールド参照できる形に平坦化して読む
interface PowerOptionsFlat {
  test_type?: TestType;
  sig_level?: number;
  power?: number;
  n?: number;
  effect_size?: number;
  ttest_type?: TTestOptions['ttest_type'];
  groups?: number;
  between_var?: number;
  within_var?: number;
  p1?: number;
  p2?: number;
}

export function formatPowerOptions(options: AnalysisOptions): string | null {
  const o = options as PowerOptionsFlat;
  const parts: string[] = [];
  if (o.test_type) parts.push(`検定の種類: ${labelOf(TEST_TYPE_OPTIONS, o.test_type)}`);
  if (o.sig_level !== undefined) parts.push(`有意水準 α: ${o.sig_level}`);
  if (o.power !== undefined) parts.push(`検出力 (1−β): ${o.power}`);
  if (o.n !== undefined) parts.push(`サンプルサイズ n: ${o.n}`);
  if (o.effect_size !== undefined) parts.push(`効果量 (delta): ${o.effect_size}`);
  if (o.ttest_type) parts.push(`t検定の種類: ${labelOf(TTEST_TYPE_OPTIONS, o.ttest_type)}`);
  if (o.groups !== undefined) parts.push(`群数: ${o.groups}`);
  if (o.between_var !== undefined) parts.push(`群間分散: ${o.between_var}`);
  if (o.within_var !== undefined) parts.push(`群内分散: ${o.within_var}`);
  if (o.p1 !== undefined) parts.push(`比率1: ${o.p1}`);
  if (o.p2 !== undefined) parts.push(`比率2: ${o.p2}`);
  return parts.length > 0 ? parts.join(' / ') : null;
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
    <VStack align="stretch" gap={4}>
      <GoldenSplit
        primary={
          <FieldFrame label="検定パラメータ">
            <VStack align="stretch" gap={3}>
              <Text fontSize="xs" color="fg.muted">
                有意水準 α は常に指定します (空欄にすると既定値 0.05 に戻ります)。α
                以外の項目のうち、求めたい値1つだけを空欄にしてください。空欄の値が解として算出されます。
              </Text>
              <SimpleGrid columns={2} gap={3}>
                <NumberField
                  label="有意水準 α"
                  value={sigLevel}
                  onChange={(v) => setSigLevel(v ?? 0.05)}
                />
                <NumberField label="検出力 (1−β)" value={power} onChange={setPower} />
                <NumberField label="サンプルサイズ n" value={n} onChange={setN} />
                {testType === 't' && (
                  <NumberField
                    label="効果量 (delta)"
                    value={effectSize}
                    onChange={setEffectSize}
                  />
                )}
                {testType === 'anova' && (
                  <>
                    <NumberField label="群数 groups" value={groups} onChange={setGroups} />
                    <NumberField
                      label="群間分散 between.var"
                      value={betweenVar}
                      onChange={setBetweenVar}
                    />
                    <NumberField
                      label="群内分散 within.var"
                      value={withinVar}
                      onChange={setWithinVar}
                    />
                  </>
                )}
                {testType === 'prop' && (
                  <>
                    <NumberField label="比率1 p1" value={p1} onChange={setP1} />
                    <NumberField label="比率2 p2" value={p2} onChange={setP2} />
                  </>
                )}
              </SimpleGrid>
            </VStack>
          </FieldFrame>
        }
        secondary={
          <VStack align="stretch" gap={3}>
            <RadioField
              label="検定の種類"
              options={TEST_TYPE_OPTIONS}
              value={testType}
              onChange={setTestType}
            />
            {testType === 't' && (
              <RadioField
                label="t検定の種類"
                options={TTEST_TYPE_OPTIONS}
                value={ttestType}
                onChange={setTtestType}
              />
            )}
          </VStack>
        }
      />
      <ModalActions busy={busy} onCancel={onCancel} onSubmit={handleSubmit} />
    </VStack>
  );
}
