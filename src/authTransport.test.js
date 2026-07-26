import test from 'node:test';
import assert from 'node:assert/strict';
import { isSameOriginApiUrl } from './authTransport.js';

test('탭 세션 토큰은 같은 출처의 API 요청에만 첨부한다', () => {
  const origin = 'https://medihelpers-career.junnyai.chatgpt.site';
  assert.equal(isSameOriginApiUrl('/api/account', origin), true);
  assert.equal(isSameOriginApiUrl(`${origin}/api/member-center`, origin), true);
  assert.equal(isSameOriginApiUrl(`${origin}/mypage`, origin), false);
  assert.equal(isSameOriginApiUrl('https://example.com/api/account', origin), false);
});
