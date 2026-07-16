// 균형 노출 (balanced job exposure) 순수 모듈.
//
// 특정 진료과·지역 공고가 몰려도 목록이 한쪽으로 쏠리지 않도록,
// 진료과(dept)와 지역(region) 기준으로 안정적인 라운드로빈 인터리빙을 수행합니다.
// - 같은 입력·같은 seed면 항상 같은 결과 (세션 내 안정).
// - seed로 첫 진료과 시작점만 회전시켜(daily rotation) 매일 노출을 순환시키되,
//   한 세션 안에서는 무작위 재정렬이 없습니다.
// - 가장 작은 버킷 내부에서는 원본 입력 순서를 그대로 유지해 최신 등록순 대용으로 씁니다.
// - 항목 손실/중복 없이 입력과 정확히 같은 원소 집합을 반환합니다.

const MISSING = '__none__';

export const AD_TIER_ORDER = ['spotlight', 'featured', 'basic'];

export const defaultDeptKey = (item) => {
  const value = item && item.dept;
  return value == null || value === '' ? MISSING : String(value);
};

export const defaultRegionKey = (item) => {
  const value = item && item.region;
  return value == null || value === '' ? MISSING : String(value);
};

const normalizeSeed = (seed) => {
  const n = Number(seed);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

// 첫 등장 순서를 보존하는 안정적 버킷화. Map은 삽입 순서를 유지합니다.
function stableBuckets(items, keyFn) {
  const buckets = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  });
  return buckets;
}

/**
 * 진료과(dept)로 라운드로빈하며, 각 선택 안에서는 지역(region)이 가장 오래 전에
 * 쓰인 항목을 우선 골라 지역까지 분산시킵니다. 동점이면 원본 순서를 유지합니다.
 *
 * @param {Array} items 원본 순서(최신 등록순 대용)를 가진 배열
 * @param {{seed?:number, deptKey?:Function, regionKey?:Function}} [options]
 * @returns {Array} 균형 재배열된 새 배열 (원본 불변)
 */
export function balancedOrder(items, options = {}) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const { seed = 0, deptKey = defaultDeptKey, regionKey = defaultRegionKey } = options;
  const buckets = stableBuckets(items, deptKey);
  const keys = [...buckets.keys()];
  // seed로 시작 진료과만 회전 (음수 seed도 안전)
  const rot = keys.length ? (((normalizeSeed(seed) % keys.length) + keys.length) % keys.length) : 0;
  const orderedKeys = keys.slice(rot).concat(keys.slice(0, rot));

  const result = [];
  const regionLastUsed = new Map(); // region -> 마지막으로 배치된 위치
  let position = 0;

  while (result.length < items.length) {
    for (const key of orderedKeys) {
      const bucket = buckets.get(key);
      if (!bucket || bucket.length === 0) continue;
      // 지역이 가장 오래 전에(또는 아직) 안 쓰인 항목 선택. 동점은 원본 순서(먼저 나온 것).
      let chosen = 0;
      let bestScore = Infinity;
      for (let i = 0; i < bucket.length; i += 1) {
        const region = regionKey(bucket[i]);
        const last = regionLastUsed.has(region) ? regionLastUsed.get(region) : -1;
        if (last < bestScore) {
          bestScore = last;
          chosen = i;
        }
      }
      const [picked] = bucket.splice(chosen, 1);
      regionLastUsed.set(regionKey(picked), position);
      result.push(picked);
      position += 1;
    }
  }
  return result;
}

const tierOf = (item) => {
  const tier = item && item.adTier;
  return tier == null || tier === '' ? 'basic' : String(tier);
};

const tierRank = (tier) => {
  const index = AD_TIER_ORDER.indexOf(tier);
  return index === -1 ? AD_TIER_ORDER.length : index;
};

/**
 * 프리미엄(광고) 항목 정렬: 등급 우선순위(spotlight → featured → basic)를 지키면서
 * 각 등급 내부에서만 진료과·지역 균형을 맞춥니다.
 *
 * @param {Array} items 광고 항목 배열
 * @param {{seed?:number, deptKey?:Function, regionKey?:Function}} [options]
 * @returns {Array}
 */
export function orderPremium(items, options = {}) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const groups = stableBuckets(items, tierOf);
  const tiers = [...groups.keys()].sort((a, b) => tierRank(a) - tierRank(b));
  const result = [];
  tiers.forEach((tier) => {
    result.push(...balancedOrder(groups.get(tier), options));
  });
  return result;
}

/**
 * 임의 키 기준 개수 집계. 첫 등장 순서를 보존한 배열을 반환합니다.
 *
 * @param {Array} items
 * @param {Function} [keyFn]
 * @returns {Array<{key:string, count:number}>}
 */
export function countBy(items, keyFn = defaultDeptKey) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const counts = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].map(([key, count]) => ({ key, count }));
}

/**
 * 진료과 개수 집계(기본 진료과 키 사용).
 * @param {Array} items
 * @returns {Array<{key:string, count:number}>}
 */
export function countByDept(items) {
  return countBy(items, defaultDeptKey);
}
