const MOODS = {
  pediatric: { id: 'pediatric', primary: '#7357d8', accent: '#a991ef', surface: '#f5f1ff', deep: '#30245f' },
  women: { id: 'women', primary: '#b94f7d', accent: '#e59ab9', surface: '#fff1f6', deep: '#61253f' },
  checkup: { id: 'checkup', primary: '#087f9f', accent: '#45b8bf', surface: '#ecf9fa', deep: '#164b5b' },
  spine: { id: 'spine', primary: '#2768c9', accent: '#79a8ec', surface: '#edf4ff', deep: '#193f78' },
  korean: { id: 'korean', primary: '#27866f', accent: '#71b9a5', surface: '#eef9f5', deep: '#225b4d' },
  care: { id: 'care', primary: '#9a6c34', accent: '#d0a467', surface: '#fff7ea', deep: '#5b3f21' },
  general: { id: 'general', primary: '#2367d7', accent: '#67a0ed', surface: '#eef4ff', deep: '#183d76' },
  indigo: { id: 'indigo', primary: '#5961c7', accent: '#9298e5', surface: '#f1f2ff', deep: '#34386f' },
  mint: { id: 'mint', primary: '#168b83', accent: '#63c2b5', surface: '#edfaf7', deep: '#18534f' },
  slate: { id: 'slate', primary: '#4b6f91', accent: '#88a9c5', surface: '#f0f6fa', deep: '#29445d' }
};

const FALLBACK_IDS = ['general', 'indigo', 'mint', 'slate'];

function stableHash(value = '') {
  return [...String(value)].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 17);
}

export function inferHospitalMood(job = {}) {
  if (job.brandMood && MOODS[job.brandMood]) return job.brandMood;
  const source = `${job.hospital || ''} ${job.dept || ''} ${job.facilityType || ''} ${job.focus || ''}`;
  if (/\uC18C\uC544|\uC5B4\uB9B0\uC774|\uC544\uB3D9/.test(source)) return 'pediatric';
  if (/\uC5EC\uC131|\uC0B0\uBD80\uC778\uACFC|\uB09C\uC784/.test(source)) return 'women';
  if (/\uAC80\uC9C4|\uC601\uC0C1|\uC6F0\uB2C8\uC2A4|\uAC74\uAC15/.test(source)) return 'checkup';
  if (/\uCC99\uCD94|\uAD00\uC808|\uC815\uD615|\uD1B5\uC99D|\uC7AC\uD65C/.test(source)) return 'spine';
  if (/\uD55C\uBC29|\uD55C\uC758|\uD55C\uBC29\uBCD1\uC6D0/.test(source)) return 'korean';
  if (/\uC694\uC591|\uB178\uC778|\uC7AC\uD65C\uBCD1\uC6D0/.test(source)) return 'care';
  return FALLBACK_IDS[stableHash(job.hospital) % FALLBACK_IDS.length];
}

export function getHospitalMood(job = {}) {
  const mood = MOODS[inferHospitalMood(job)] || MOODS.general;
  if (!job.brandColor) return mood;
  return { ...mood, primary: job.brandColor };
}

// 광고(집중채용) 공고 카드는 같은 상품이므로 병원별로 색을 다르게 하지 않고 골드 한 가지로 통일한다.
// (병원 로고 색상 등 다른 용도는 getHospitalMood를 그대로 사용해 병원별 개성을 유지)
export const AD_GOLD_MOOD = { id: 'gold', primary: '#b98a2e', accent: '#e2bd6a', surface: '#fdf7ea', deep: '#5d431a' };

export function hospitalMoodStyle() {
  return {
    '--job-color': AD_GOLD_MOOD.primary,
    '--job-accent': AD_GOLD_MOOD.accent,
    '--job-surface': AD_GOLD_MOOD.surface,
    '--job-deep': AD_GOLD_MOOD.deep
  };
}

export const premiumBannerGuide = {
  ratio: '3:1',
  width: 1500,
  height: 500,
  maxBytes: 8 * 1024 * 1024,
  minRatio: 2.6,
  maxRatio: 3.4
};
