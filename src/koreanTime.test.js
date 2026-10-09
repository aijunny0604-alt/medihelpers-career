import {test} from 'node:test';
import assert from 'node:assert/strict';
import {koreanDate,koreanInputToIso} from './koreanTime.js';
test('member payment date crosses UTC midnight at Korean midnight',()=>{
 assert.equal(koreanDate('2026-10-08 14:59:59'),'2026-10-08');
 for(const v of ['2026-10-08 15:00:00','2026-10-08T15:00:00Z','2026-10-08T15:00:00','2026-10-09T00:00:00+09:00'])assert.equal(koreanDate(v),'2026-10-09');
 assert.equal(koreanDate('2026-10-09'),'2026-10-09');assert.equal(koreanDate(null),'기록 없음');assert.equal(koreanDate('invalid'),'시각 확인 필요');
});
test('refund wall clock is always Korean time with minute and second precision',()=>{
 assert.equal(koreanInputToIso('2026-10-09T00:00'),'2026-10-08T15:00:00.000Z');
 assert.equal(koreanInputToIso('2026-10-09T00:00:59'),'2026-10-08T15:00:59.000Z');
 assert.equal(koreanInputToIso('2028-02-29T12:00'),'2028-02-29T03:00:00.000Z');
});
test('invalid or offset-bearing refund wall clocks are rejected instead of normalized',()=>{
 for(const v of ['',null,'2026-02-29T12:00','2026-10-09T24:00','2026-10-09T10:60','2026-10-09T10:00Z','2026-10-09T10:00+09:00'])assert.throws(()=>koreanInputToIso(v));
});
