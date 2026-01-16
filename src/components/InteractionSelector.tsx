import { Box, Checkbox, CheckboxGroup, Fieldset, Stack, Text } from '@chakra-ui/react';
import { useEffect, useMemo } from 'react';

interface InteractionSelectorProps {
  independentVars: string[];
  value: string[];
  onValueChange: (value: string[]) => void;
  includeAll: boolean;
  onIncludeAllChange: (checked: boolean) => void;
  center: boolean;
  onCenterChange: (checked: boolean) => void;
}

// Generate combinations of k elements from array
const combinations = <T,>(array: T[], k: number): T[][] => {
  if (k === 0) return [[]];
  if (array.length < k) return [];

  const result: T[][] = [];
  const combine = (start: number, combo: T[]) => {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < array.length; i++) {
      combo.push(array[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  };
  combine(0, []);
  return result;
};

// Generate interaction term string (e.g., "X1:X2" or "X1:X2:X3")
const toInteractionTerm = (vars: string[]): string => vars.join(':');

const InteractionSelector = ({
  independentVars,
  value,
  onValueChange,
  includeAll,
  onIncludeAllChange,
  center,
  onCenterChange,
}: InteractionSelectorProps) => {
  // Generate all possible interaction terms
  const { twoWay, threeWay, allTerms } = useMemo(() => {
    const twoWay = combinations(independentVars, 2).map(toInteractionTerm);
    const threeWay =
      independentVars.length >= 3 ? combinations(independentVars, 3).map(toInteractionTerm) : [];
    return {
      twoWay,
      threeWay,
      allTerms: [...twoWay, ...threeWay],
    };
  }, [independentVars]);

  // Sync value when includeAll changes
  useEffect(() => {
    if (includeAll) {
      onValueChange(allTerms);
    }
  }, [includeAll, allTerms, onValueChange]);

  const canCreateInteractions = independentVars.length >= 2;
  const canIncludeAll = independentVars.length >= 2 && independentVars.length <= 3;

  // When no interactions can be created
  if (!canCreateInteractions) {
    return (
      <Box>
        <Text fontWeight="medium" mb="2">
          交互作用
        </Text>
        <Text fontSize="sm" color="gray.500">
          独立変数を2つ以上選択すると交互作用を設定できます
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text fontWeight="medium" mb="2">
        交互作用
      </Text>
      <Stack gap="3" maxH="140px" overflowY="auto" pr="2">
        <Fieldset.Root>
          <CheckboxGroup
            value={value}
            onValueChange={(values) => {
              if (!includeAll) {
                onValueChange(values);
              }
            }}
          >
            <Fieldset.Content gap="2">
              {twoWay.length > 0 && (
                <Box>
                  <Text fontSize="xs" color="gray.500" mb="1">
                    2変数
                  </Text>
                  <Stack gap="1">
                    {twoWay.map((term) => (
                      <Checkbox.Root
                        key={term}
                        value={term}
                        size="sm"
                        disabled={includeAll}
                        checked={includeAll || value.includes(term)}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label>{term}</Checkbox.Label>
                      </Checkbox.Root>
                    ))}
                  </Stack>
                </Box>
              )}
              {threeWay.length > 0 && (
                <Box>
                  <Text fontSize="xs" color="gray.500" mb="1">
                    3変数
                  </Text>
                  <Stack gap="1">
                    {threeWay.map((term) => (
                      <Checkbox.Root
                        key={term}
                        value={term}
                        size="sm"
                        disabled={includeAll}
                        checked={includeAll || value.includes(term)}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label>{term}</Checkbox.Label>
                      </Checkbox.Root>
                    ))}
                  </Stack>
                </Box>
              )}
            </Fieldset.Content>
          </CheckboxGroup>
        </Fieldset.Root>
      </Stack>
      <Box mt="3" pt="3" borderTopWidth="1px" borderColor="gray.200">
        <Stack gap="2">
          <Checkbox.Root
            size="sm"
            checked={includeAll}
            disabled={!canIncludeAll}
            onCheckedChange={(e) => onIncludeAllChange(!!e.checked)}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>
              全ての交互作用を投入する
              {!canIncludeAll && independentVars.length > 3 && (
                <Text as="span" fontSize="xs" color="gray.500" ml="1">
                  (独立変数3つまで)
                </Text>
              )}
            </Checkbox.Label>
          </Checkbox.Root>
          <Checkbox.Root size="sm" checked={center} onCheckedChange={(e) => onCenterChange(!!e.checked)}>
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>説明変数を中心化する</Checkbox.Label>
          </Checkbox.Root>
        </Stack>
      </Box>
    </Box>
  );
};

export default InteractionSelector;
