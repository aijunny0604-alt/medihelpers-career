import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesJobKeywords, matchesKeywords } from './keywordSearch.js';

test('검색 인덱스 재사용 후에도 공고 수정·복리후생 배열 수정이 즉시 반영된다', () => {
  const job = {title:'서울 내과', benefits:['주 4일'], summary:'경력 무관'};
  assert.equal(matchesJobKeywords(job, '서울내과'), true);
  job.title = '부산 소아과';
  assert.equal(matchesJobKeywords(job, '서울내과'), false);
  assert.equal(matchesJobKeywords(job, '소아과부산'), true);
  assert.equal(matchesJobKeywords(job, '주4일'), true);
  job.benefits[0] = '주 5일';
  assert.equal(matchesJobKeywords(job, '주4일'), false);
  assert.equal(matchesJobKeywords(job, '주5일'), true);
  job.benefits.push('숙소 제공');
  assert.equal(matchesJobKeywords(job, '숙소제공'), true);
  delete job.summary;
  assert.equal(matchesJobKeywords(job, '경력 무관'), false);
});

test('다른 공고·권한이 달라진 객체는 이전 검색 인덱스를 공유하지 않는다', () => {
  const full = {title:'서울 내과', summary:'연봉 2억 숙소제공'};
  const redacted = {title:'서울 내과', summary:'로그인 후 확인'};
  assert.equal(matchesJobKeywords(full, '숙소제공'), true);
  assert.equal(matchesJobKeywords(redacted, '숙소제공'), false);
  full.summary = redacted.summary;
  assert.equal(matchesJobKeywords(full, '숙소제공'), false);
});

test('연속 검색·빈 검색·전각 문자에서 기존 AND 검색과 소수점 의미를 유지한다', () => {
  const job = {title:'JK 위드미 전문의', region:'인천', dept:'내과', schedule:'주 4.5일'};
  for (const [query, expected] of [['인천내과',true],['내과 서울',false],['',true],['ＪＫ 위드미',true],['주45일',false],['주4.5일',true],['인천내과',true]]) {
    assert.equal(matchesJobKeywords(job,query), expected, query);
  }
  assert.equal(matchesKeywords(['가나다','라마바'],'다라'),false);
});

test('캐시 재사용은 긴 본문의 반복 정규화를 하지 않는다', (t) => {
  const job = {title:'서울 내과',summary:'진료 조건 경력 협의 '.repeat(500)};
  let normalized = 0;
  const original = String.prototype.normalize;
  t.mock.method(String.prototype, 'normalize', function(...args) { normalized++; return original.apply(this,args); });
  matchesJobKeywords(job,'서울');
  normalized=0;
  for (const query of ['내과','진료','조건','경력','협의']) matchesJobKeywords(job,query);
  assert.equal(normalized,5,'입력된 검색어만 정규화해야 한다');
  normalized=0;
  matchesJobKeywords(job,'협의');
  assert.equal(normalized,0,'같은 입력의 두 번째 필터는 정규화와 매칭 결과를 재사용한다');
});
