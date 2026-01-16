import { createRunCorrelation } from './correlation';
import { createRunDescriptive } from './descriptive';
import { createRunReliability } from './reliability';
import type { AnalysisHandlerDeps } from './types';

export const createAnalysisHandlers = (deps: AnalysisHandlerDeps) => ({
  runDescriptive: createRunDescriptive(deps),
  runCorrelation: createRunCorrelation(deps),
  runReliability: createRunReliability(deps),
});
