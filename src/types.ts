export type CorrAlt = 'two.sided' | 'greater' | 'less';

export type CorrMethods = {
  pearson: boolean;
  kendall: boolean;
  spearman: boolean;
};

export type CorrOptionValue = {
  methods: CorrMethods;
  alt: CorrAlt;
  use: CorrUse;
};

export type CorrUse = 'all.obs' | 'complete.obs' | 'pairwise.complete.obs';

export type DescriptiveOrder = 'default' | 'mean_asc' | 'mean_desc';
