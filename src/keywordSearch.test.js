import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesKeywords, matchesJobKeywords } from './keywordSearch.js';

test('띄어쓰기·대소문자·키워드 순서를 바꿔도 실제 공고 필드에서 검색한다', () => {
  const job = {hospital:'JK 위드미', title:'내과 전문의 초빙', region:'인천', location:'송도동 연수구', dept:'내과', schedule:'주 4일'};
  for (const keyword of ['JK위드미', 'jk 위드미', 'ＪＫ　위드미', '위드미 송도', '송도 위드미', '인천 내과', '내과인천', '인천내과', '주4일', '주 4 일']) {
    assert.equal(matchesJobKeywords(job, keyword), true, keyword);
  }
  for (const keyword of ['서울 내과', '송도 소아과', '주5일', '없는병원', '인천없는병원']) {
    assert.equal(matchesJobKeywords(job, keyword), false, keyword);
  }
});

test('여러 키워드는 모두 일치해야 하며 숫자 소수점과 필드 경계를 보존한다', () => {
  assert.equal(matchesKeywords(['서울', '내과', '주 4.5일'], '내과 서울 주4.5일'), true);
  assert.equal(matchesKeywords(['서울', '내과', '주 4.5일'], '주45일'), false);
  assert.equal(matchesKeywords(['가나다', '라마바'], '다라'), false);
  assert.equal(matchesKeywords(['a', 'b'], 'ab'), false);
  assert.equal(matchesKeywords([], '  '), true);
  assert.equal(matchesJobKeywords({}, 'undefined'), false);
});
