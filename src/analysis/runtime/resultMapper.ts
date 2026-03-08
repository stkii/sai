import type { ParsedDataTable } from '../../types';
import type { AnalysisResult, AnalysisSection } from '../types';

interface RawRegressionResult {
  model_summary: ParsedDataTable;
  coefficients: ParsedDataTable;
  anova: ParsedDataTable;
}

interface RawFactorResult {
  eigen: ParsedDataTable;
  pattern: ParsedDataTable;
  rotmat: ParsedDataTable;
  structure?: ParsedDataTable | null;
  phi?: ParsedDataTable | null;
}

interface RawTableAnalysisResult {
  kind: 'table';
  table: ParsedDataTable;
}

interface RawRegressionAnalysisResult {
  kind: 'regression';
  regression: RawRegressionResult;
}

interface RawFactorAnalysisResult {
  kind: 'factor';
  factor: RawFactorResult;
}

export type RawBackendAnalysisResult =
  | RawTableAnalysisResult
  | RawRegressionAnalysisResult
  | RawFactorAnalysisResult;

const createSection = (key: string, label: string, table: ParsedDataTable): AnalysisSection => {
  return { key, label, table };
};

export const mapBackendAnalysisResult = (raw: RawBackendAnalysisResult): AnalysisResult => {
  if (raw.kind === 'table') {
    return {
      sections: [createSection('table', '結果', raw.table)],
    };
  }

  if (raw.kind === 'regression') {
    return {
      sections: [
        createSection('model_summary', 'モデル要約', raw.regression.model_summary),
        createSection('coefficients', '係数', raw.regression.coefficients),
        createSection('anova', 'ANOVA', raw.regression.anova),
      ],
    };
  }

  const sections: AnalysisSection[] = [
    createSection('eigen', '固有値', raw.factor.eigen),
    createSection('pattern', '因子負荷量', raw.factor.pattern),
    createSection('rotmat', '回転行列', raw.factor.rotmat),
  ];

  if (raw.factor.structure) {
    sections.push(createSection('structure', '構造行列', raw.factor.structure));
  }
  if (raw.factor.phi) {
    sections.push(createSection('phi', '因子相関', raw.factor.phi));
  }

  return { sections };
};
