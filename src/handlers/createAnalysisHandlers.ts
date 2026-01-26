import { createRunCorrelation } from './correlation';
import { createRunDescriptive } from './descriptive';
import { createRunFactor } from './factor';
import { createRunPowerTest } from './power';
import { createRunRegression } from './regression';
import { createRunReliability } from './reliability';
import type { AnalysisHandlerDeps } from './types';

export const createAnalysisHandlers = (deps: AnalysisHandlerDeps) => ({
  runDescriptive: createRunDescriptive(deps),
  runCorrelation: createRunCorrelation(deps),
  runRegression: createRunRegression(deps),
  runReliability: createRunReliability(deps),
  runFactor: createRunFactor(deps),
  runPowerTest: createRunPowerTest(deps),
});
