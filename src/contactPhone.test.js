import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeContactPhone } from './contactPhone.js';
import { normalizeWebsiteUrl } from './websiteUrl.js';
import { validateField } from './signupFields.js';
test('contact phone supports mobile and office numbers without silently truncating',()=>{
  assert.equal(normalizeContactPhone('01012345678'),'010-1234-5678');
  assert.equal(normalizeContactPhone('02-123-4567'),'02-123-4567');
  assert.equal(normalizeContactPhone('0511234567'),'051-123-4567');
  assert.equal(normalizeContactPhone(''), '');
  for (const bad of ['garbage01012345678','010123456789999','<script>','1234']) assert.equal(normalizeContactPhone(bad),null);
});
test('optional homepage accepts free text; only HTTP addresses become normalized links',()=>{
  for (const value of ['', 'www.medihelpers.co.kr', 'medihelpers.co.kr', '홈페이지 준비 중']) assert.equal(validateField('website',{website:value}),'');
  assert.equal(normalizeWebsiteUrl('www.medihelpers.co.kr'),'https://www.medihelpers.co.kr/');
  for (const bad of ['javascript:alert(1)','https://user:pass@example.com','홈페이지 준비 중','//evil.com','data:text/html,test']) assert.equal(normalizeWebsiteUrl(bad),'');
});
