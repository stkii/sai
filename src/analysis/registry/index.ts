import correlationMethod from '../methods/correlation';
import descriptiveMethod from '../methods/descriptive';
import type { AnalysisMethodModule } from './types';

export const ANALYSIS_METHODS = [
  descriptiveMethod,
  correlationMethod,
] as const satisfies readonly AnalysisMethodModule[];
