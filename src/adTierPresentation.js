const AD_TIER_PRESENTATION = {
  spotlight: {
    key: 'main',
    label: '메인 광고',
    description: '메인 영역 우선 노출',
  },
  featured: {
    key: 'main',
    label: '메인 광고',
    description: '메인 영역 우선 노출',
  },
  basic: {
    key: 'basic',
    label: '베이직 광고',
    description: '기본 광고 노출',
  },
};

export function getAdTierPresentation(tier) {
  return AD_TIER_PRESENTATION[tier] || null;
}

