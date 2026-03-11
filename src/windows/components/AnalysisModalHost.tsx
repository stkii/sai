import { Fragment } from 'react';
import type { AnalysisOptions, MethodModule, SupportedAnalysisType } from '../../analysis/api';

interface Props {
  methods: readonly MethodModule[];
  openAnalysis: SupportedAnalysisType | null;
  variables: string[];
  onClose: () => void;
  onExecute: (
    type: SupportedAnalysisType,
    selectedVariables: string[],
    options: AnalysisOptions
  ) => Promise<void>;
}

export const AnalysisModalHost = ({
  methods,
  openAnalysis,
  variables,
  onClose,
  onExecute,
}: Props) => {
  return (
    <>
      {methods.map((method) => (
        <Fragment key={method.definition.key}>
          {method.renderModal({
            open: openAnalysis === method.definition.key,
            onClose,
            variables,
            onExecute: async (selectedVariables, options) => {
              await onExecute(method.definition.key, selectedVariables, options);
            },
          })}
        </Fragment>
      ))}
    </>
  );
};
