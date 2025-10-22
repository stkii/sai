import { createElement, type ReactNode } from 'react';

import CorrAnalysisPage from './pages/analysis/CorrAnalysisPage';
import DescriptiveStatsPage from './pages/analysis/DescriptiveStatsPage';
import ReliabilityPage from './pages/analysis/ReliabilityPage';
import type { CorrOptionValue, DescriptiveOrder } from './types';

export type AnalysisType = 'descriptive' | 'correlation' | 'reliability';

export type AnalysisLocalState = {
  selectedVars: string[];
  order: DescriptiveOrder;
  corrOptions: CorrOptionValue | null;
};

export type EditorContext = {
  path: string;
  sheet: string;
  state: AnalysisLocalState;
  setSelectedVars: (v: string[]) => void;
  setOrder: (v: DescriptiveOrder) => void;
  setCorrOptions: (v: CorrOptionValue) => void;
};

export type AnalysisDefinition = {
  id: AnalysisType;
  label: string;
  // UI renderer for the analysis-specific editor. Reuses existing components.
  renderEditor: (ctx: EditorContext) => ReactNode;
  // Build normalized params object for payload/log export
  buildParamsForPayload: (state: AnalysisLocalState) => unknown | undefined;
  // Build options JSON to pass to the R backend
  buildOptionsJson: (state: AnalysisLocalState) => string | undefined;
};

const descriptiveDef: AnalysisDefinition = {
  id: 'descriptive',
  label: '記述統計',
  renderEditor: ({ path, sheet, setSelectedVars, setOrder }) =>
    createElement(DescriptiveStatsPage, {
      path,
      sheet,
      onSelectionChange: (sel, ord) => {
        setSelectedVars(sel);
        setOrder(ord);
      },
    }),
  buildParamsForPayload: (state) => ({ order: state.order }),
  buildOptionsJson: (state) => JSON.stringify({ order: state.order }),
};

const correlationDef: AnalysisDefinition = {
  id: 'correlation',
  label: '相関',
  renderEditor: ({ path, sheet, setSelectedVars, setCorrOptions }) =>
    createElement(CorrAnalysisPage, {
      path,
      sheet,
      onSelectionChange: (sel, opts) => {
        setSelectedVars(sel);
        setCorrOptions(opts);
      },
    }),
  buildParamsForPayload: (state) => {
    const sel =
      state.corrOptions ??
      ({
        methods: { pearson: true, kendall: false, spearman: false },
        alt: 'two.sided',
        use: 'all.obs',
      } as const);
    const params = {
      methods: Object.entries(sel.methods)
        .filter(([, v]) => !!v)
        .map(([k]) => k),
      alt: sel.alt,
      use: sel.use,
    } as { methods: string[]; alt: string; use: string };
    return params;
  },
  buildOptionsJson: (state) => {
    const p = correlationDef.buildParamsForPayload(state) as {
      methods: string[];
      alt: string;
      use: string;
    };
    return JSON.stringify(p);
  },
};

export const ANALYSIS_REGISTRY: Record<AnalysisType, AnalysisDefinition> = {
  descriptive: descriptiveDef,
  correlation: correlationDef,
  reliability: {
    id: 'reliability',
    label: '信頼性',
    renderEditor: ({ path, sheet, setSelectedVars }) =>
      createElement(ReliabilityPage, {
        path,
        sheet,
        onSelectionChange: (sel) => setSelectedVars(sel),
      }),
    // 現状パラメータはなし（既定で Cronbach の α）。
    buildParamsForPayload: () => undefined,
    buildOptionsJson: () => undefined,
  },
};
