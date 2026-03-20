import type { AnalysisOptions, SupportedAnalysisType } from '../../analysis/api';

interface FormattedOption {
  label: string;
  value: string;
}

const formatCorrelation = (options: AnalysisOptions): FormattedOption[] => {
  const result: FormattedOption[] = [];

  const methodLabels: Record<string, string> = {
    pearson: 'Pearson',
    spearman: 'Spearman',
    kendall: 'Kendall',
  };
  if (options.method) {
    result.push({
      label: '係数',
      value: methodLabels[String(options.method)] ?? String(options.method),
    });
  }

  const useLabels: Record<string, string> = {
    'complete.obs': 'リストワイズ除去',
    'pairwise.complete.obs': 'ペアワイズ除去',
  };
  if (options.use) {
    result.push({ label: '欠損値', value: useLabels[String(options.use)] ?? String(options.use) });
  }

  const altLabels: Record<string, string> = {
    'two.sided': '両側',
    less: '片側（左）',
    greater: '片側（右）',
  };
  if (options.alternative) {
    result.push({
      label: '検定',
      value: altLabels[String(options.alternative)] ?? String(options.alternative),
    });
  }

  return result;
};

const formatInteractions = (interactions: unknown): string | null => {
  if (interactions === 'all') {
    return 'すべて';
  }
  if (typeof interactions === 'object' && interactions !== null && 'mode' in interactions) {
    const mode = (interactions as { mode: string }).mode;
    if (mode === 'none') return 'なし';
    if (mode === 'auto') return '自動（全組み合わせ）';
    if (mode === 'manual') {
      const terms = (interactions as { terms?: string[][] }).terms;
      if (Array.isArray(terms) && terms.length > 0) {
        return terms.map((t) => t.join(' × ')).join(', ');
      }
      return '手動（指定なし）';
    }
  }
  if (Array.isArray(interactions)) {
    if (interactions.length === 0) return null;
    return interactions.map((t: string[]) => t.join(' × ')).join(', ');
  }
  return null;
};

const formatRegression = (options: AnalysisOptions): FormattedOption[] => {
  const result: FormattedOption[] = [];

  if (options.dependent) {
    result.push({ label: '従属変数', value: String(options.dependent) });
  }
  if (Array.isArray(options.independent) && options.independent.length > 0) {
    result.push({ label: '独立変数', value: options.independent.join(', ') });
  }

  result.push({ label: '切片', value: options.intercept === false ? 'なし' : 'あり' });
  result.push({ label: '中心化', value: options.center === true ? 'あり' : 'なし' });

  if (options.interactions !== undefined) {
    const label = formatInteractions(options.interactions);
    if (label) {
      result.push({ label: '交互作用', value: label });
    }
  }

  return result;
};

const formatFactor = (options: AnalysisOptions): FormattedOption[] => {
  const result: FormattedOption[] = [];

  const methodLabels: Record<string, string> = { ml: '最尤法' };
  if (options.method) {
    result.push({
      label: '推定法',
      value: methodLabels[String(options.method)] ?? String(options.method),
    });
  }

  const rotationLabels: Record<string, string> = {
    none: 'なし',
    varimax: 'Varimax',
    oblimin: 'Oblimin',
    quartimax: 'Quartimax',
    equamax: 'Equamax',
    promax: 'Promax',
  };
  if (options.rotation !== undefined) {
    result.push({
      label: '回転',
      value: rotationLabels[String(options.rotation)] ?? String(options.rotation),
    });
  }

  if (options.n_factors_auto === true || options.n_factors_auto === undefined) {
    result.push({ label: '因子数', value: 'Guttman基準（自動）' });
  } else if (options.n_factors !== undefined) {
    result.push({ label: '因子数', value: String(options.n_factors) });
  }

  const corrUseLabels: Record<string, string> = {
    'all.obs': '全データ使用',
    'complete.obs': 'リストワイズ除去',
    'pairwise.complete.obs': 'ペアワイズ除去',
  };
  if (options.corr_use) {
    result.push({
      label: '欠損値',
      value: corrUseLabels[String(options.corr_use)] ?? String(options.corr_use),
    });
  }

  if (String(options.rotation) === 'promax' && options.power !== undefined) {
    result.push({ label: 'Promax power', value: String(options.power) });
  }

  result.push({
    label: '負荷量ソート',
    value: options.sort_loadings === true ? 'あり' : 'なし',
  });

  result.push({
    label: 'スクリープロット',
    value: options.show_scree_plot === true ? '表示' : '非表示',
  });

  return result;
};

const formatAnova = (options: AnalysisOptions): FormattedOption[] => {
  const result: FormattedOption[] = [];

  if (options.dependent) {
    result.push({ label: '従属変数', value: String(options.dependent) });
  }
  if (options.subject) {
    result.push({ label: '被験者ID', value: String(options.subject) });
  }
  if (Array.isArray(options.between_factors) && options.between_factors.length > 0) {
    result.push({ label: '被験者間要因', value: options.between_factors.join(', ') });
  }
  if (options.within_factor_name) {
    result.push({ label: '被験者内要因', value: String(options.within_factor_name) });
  }
  if (Array.isArray(options.within_factor_levels) && options.within_factor_levels.length > 0) {
    result.push({ label: '被験者内水準', value: options.within_factor_levels.join(', ') });
  }
  if (Array.isArray(options.covariates) && options.covariates.length > 0) {
    result.push({ label: '共変量', value: options.covariates.join(', ') });
  }

  if (options.interactions !== undefined) {
    const label = formatInteractions(options.interactions);
    if (label) {
      result.push({ label: '交互作用', value: label });
    }
  }

  const effectSizeLabels: Record<string, string> = {
    peta: '偏η²',
    eta: 'η²',
    omega: 'ω²',
    none: 'なし',
  };
  if (options.effect_size !== undefined) {
    result.push({
      label: '効果量',
      value: effectSizeLabels[String(options.effect_size)] ?? String(options.effect_size),
    });
  }

  return result;
};

const formatDescriptive = (options: AnalysisOptions): FormattedOption[] => {
  const result: FormattedOption[] = [];
  const orderLabels: Record<string, string> = {
    default: 'デフォルト',
    mean_asc: '平均値（昇順）',
    mean_desc: '平均値（降順）',
  };
  if (options.order) {
    result.push({
      label: '並び順',
      value: orderLabels[String(options.order)] ?? String(options.order),
    });
  }
  const stats: string[] = [];
  if (options.skewness) stats.push('歪度');
  if (options.kurtosis) stats.push('尖度');
  if (stats.length > 0) {
    result.push({ label: '統計量', value: stats.join('、') });
  }
  const histogramLabels: Record<string, string> = {
    all: '全ての変数',
    selected: '個別に選択',
  };
  if (options.histogram && options.histogram !== 'none') {
    result.push({
      label: 'ヒストグラム',
      value: histogramLabels[String(options.histogram)] ?? String(options.histogram),
    });
    const breaksLabels: Record<string, string> = {
      Sturges: 'Sturges',
      Scott: 'Scott',
      FD: 'Freedman-Diaconis',
    };
    if (options.breaks) {
      result.push({
        label: '階級幅',
        value: breaksLabels[String(options.breaks)] ?? String(options.breaks),
      });
    }
  }
  return result;
};

const formatReliability = (options: AnalysisOptions): FormattedOption[] => {
  const modelLabels: Record<string, string> = { alpha: "Cronbach's α" };
  if (options.model) {
    return [
      { label: 'モデル', value: modelLabels[String(options.model)] ?? String(options.model) },
    ];
  }
  return [];
};

const formatters: Record<SupportedAnalysisType, (options: AnalysisOptions) => FormattedOption[]> = {
  correlation: formatCorrelation,
  regression: formatRegression,
  factor: formatFactor,
  anova: formatAnova,
  descriptive: formatDescriptive,
  reliability: formatReliability,
};

export const formatAnalysisOptions = (
  type: SupportedAnalysisType,
  options: AnalysisOptions
): FormattedOption[] => {
  const formatter = formatters[type];
  return formatter(options);
};
