import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeRouteId, isValidRoutePath, memberTab } from './routeInput.js';
for(const path of ['/jobs/%','/jobs/%E0%A4','/mypage/inquiries/%FF'])test('malformed route is rejected without throwing: '+path,()=>{
  assert.equal(isValidRoutePath(path),false); assert.equal(decodeRouteId(path),'');
});
test('valid encoded IDs are decoded exactly once',()=>{
  assert.equal(decodeRouteId('%ED%95%9C%EA%B8%80%25'), '한글%'); assert.equal(isValidRoutePath('/jobs/100%25'),true);
});
test('unknown and absent mypage tabs use overview instead of an empty workspace',()=>{
  for(const value of [null,undefined,'','bad-tab','constructor'])assert.equal(memberTab(value),'overview');
  for(const value of ['notifications','payments','resume','ads','profile','inquiries'])assert.equal(memberTab(value),value);
});
