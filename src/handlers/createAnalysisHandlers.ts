import { createRunCorrelation } from './correlation';
import { createRunDescriptive } from './descriptive';
import { createRunRegression } from './regression';
import { createRunReliability } from './reliability';
import type { AnalysisHandlerDeps } from './types';

export const createAnalysisHandlers = (deps: AnalysisHandlerDeps) => ({
  runDescriptive: createRunDescriptive(deps),
  runCorrelation: createRunCorrelation(deps),
  runRegression: createRunRegression(deps),
  runReliability: createRunReliability(deps),
});
