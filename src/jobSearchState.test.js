import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_JOB_SEARCH, readJobSearch, jobSearchRoute, newestJobs } from './jobSearchState.js';

test('검색어·조건·정렬을 주소에서 동일하게 복원한다', () => {
  const filters = { recruitmentType: '봉직의', dept: '내과', region: '인천', condition: '주 4일', keyword: '송도 JK & 내과', sort: 'recent' };
  assert.deepEqual(readJobSearch(jobSearchRoute(filters)), filters);
  assert.deepEqual(readJobSearch('/jobs'), DEFAULT_JOB_SEARCH);
  assert.equal(readJobSearch('/jobs?sort=unknown').sort, 'balanced');
});

test('조건을 바꿀 때 이전 값을 교체하고 초기화는 검색 매개변수만 지운다', () => {
  const initial = '/jobs?keyword=old&region=서울&keyword=duplicate&utm_source=mail&sort=recent';
  const route = jobSearchRoute({ ...DEFAULT_JOB_SEARCH, keyword: '  새 검색어  ', region: '인천' }, initial);
  const params = new URLSearchParams(route.split('?')[1]);
  assert.deepEqual(params.getAll('keyword'), ['새 검색어']);
  assert.equal(params.get('region'), '인천');
  assert.equal(params.has('sort'), false);
  assert.equal(params.get('utm_source'), 'mail');
  assert.equal(jobSearchRoute(DEFAULT_JOB_SEARCH, route), '/jobs?utm_source=mail');
  assert.equal(jobSearchRoute(DEFAULT_JOB_SEARCH), '/jobs');
});

test('특수문자가 있는 검색어도 별도 검색 조건이나 경로로 해석되지 않는다', () => {
  const keyword = '내과?region=서울#title+50%';
  const route = jobSearchRoute({ ...DEFAULT_JOB_SEARCH, keyword });
  assert.equal(readJobSearch(route).keyword, keyword);
  assert.equal(readJobSearch(route).region, '전국');
  assert.equal(route.startsWith('/jobs?keyword='), true);
});

test('최신순은 원본 노출 순서 대신 게시일로 정렬하며 동일 날짜·미상 순서를 보존한다', () => {
  const jobs = [
    { id: 'old', postedDate: '2026-09-01' }, { id: 'unknown' },
    { id: 'new', postedDate: '2026-10-20' }, { id: 'same', postedDate: '2026-10-20' },
    { id: 'invalid', postedDate: '2026-02-30' }, { id: 'text', postedDate: '오늘' },
  ];
  const original = structuredClone(jobs);
  assert.deepEqual(newestJobs(jobs).map(job => job.id), ['new', 'same', 'old', 'unknown', 'invalid', 'text']);
  assert.deepEqual(jobs, original);
  assert.deepEqual(newestJobs([]), []);
});
