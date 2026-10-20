export const DEFAULT_JOB_SEARCH = Object.freeze({
  recruitmentType: '전체 초빙', dept: '전체 진료과', region: '전국',
  condition: '전체 조건', keyword: '', sort: 'balanced',
});

export function readJobSearch(route = '') {
  const params = new URLSearchParams(route.split('?')[1]?.split('#')[0] || '');
  const filters = Object.fromEntries(Object.entries(DEFAULT_JOB_SEARCH).map(([key, fallback]) => [key, params.get(key) || fallback]));
  if (!['balanced', 'recent'].includes(filters.sort)) filters.sort = 'balanced';
  return filters;
}

export function jobSearchRoute(filters, route = '/jobs') {
  const params = new URLSearchParams(route.split('?')[1]?.split('#')[0] || '');
  for (const [key, fallback] of Object.entries(DEFAULT_JOB_SEARCH)) {
    const value = String(filters[key] ?? fallback).trim();
    if (!value || value === fallback) params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return `/jobs${query ? `?${query}` : ''}`;
}

// 공개된 게시일만 사용한다. 날짜가 없는 공고와 같은 날짜의 공고는 기존 순서를 유지한다.
export function newestJobs(jobs) {
  const stamp = (job) => {
    const date = String(job.postedDate || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 0;
    const time = Date.parse(`${date}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date ? time : 0;
  };
  return [...jobs].sort((a, b) => stamp(b) - stamp(a));
}
