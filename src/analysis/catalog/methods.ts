import type { AnalysisMethodModule } from '../methods/contracts';
import correlationMethod from '../methods/correlation';
import descriptiveMethod from '../methods/descriptive';

export const ANALYSIS_METHODS = [
  descriptiveMethod,
  correlationMethod,
] as const satisfies readonly AnalysisMethodModule[];
