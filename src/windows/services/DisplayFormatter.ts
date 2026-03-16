import type { MethodModule } from '../../analysis/api';

export const buildMethodItems = (methods: readonly MethodModule[]) => {
  return methods.map((method) => ({
    label: method.definition.label,
    value: method.definition.key,
  }));
};
