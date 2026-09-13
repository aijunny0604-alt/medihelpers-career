import test from 'node:test';
import assert from 'node:assert/strict';
import { demoTalentDetail, loadTalentAccess } from './talentDetailAccess.js';
import { talent } from './data.js';
import { operationalTalent } from './siteOperations.js';

test('every bundled example exposes its existing introduction without contact data', () => {
  for (const person of talent) {
    const preview = demoTalentDetail({ ...person, isDemo: true, phone: 'DO-NOT-COPY', email: 'DO-NOT-COPY', fullName: 'DO-NOT-COPY' });
    assert.equal(preview.detail.introduction, person.introduction || '');
    assert.equal(preview.specialty, person.dept);
    assert.ok(!JSON.stringify(preview).includes('DO-NOT-COPY'));
    assert.equal(preview.name, undefined);
  }
});
test('real published records cannot opt into the bundled preview path', () => {
  const [person] = operationalTalent([{ id: 'seeker-real', contentType: 'talent_profile', payload: { isDemo: true, introduction: 'private' } }]);
  assert.equal(demoTalentDetail(person), null);
  assert.equal(demoTalentDetail({ introduction: 'private', isDemo: 'true' }), null);
});
test('example career projection omits unrelated fields', () => {
  const preview = demoTalentDetail({ isDemo: true, careers: [null, { institution: '가상 병원', phone: 'DO-NOT-COPY' }] });
  assert.equal(preview.detail.careers.length, 1);
  assert.equal(preview.detail.careers[0].phone, undefined);
});
const response = (status, body) => async () => new Response(JSON.stringify(body), { status });
test('paid detail is accepted only from a successful server response', async () => {
  const result = await loadTalentAccess('/test', response(200, { unlocked: true, accessReason: 'ticket', contactProtected: true, detail: { name: '', phone: '', detail: { introduction: 'saved résumé' } } }));
  assert.equal(result.unlocked, true);
  assert.equal(result.detail.detail.introduction, 'saved résumé');
  assert.equal(result.contactProtected, true);
});
test('locked response cannot inject private detail', async () => {
  const result = await loadTalentAccess('/test', response(200, { unlocked: false, detail: { phone: 'DO-NOT-COPY' } }));
  assert.equal(result.detail, null);
  assert.equal(result.error, undefined);
});
test('missing post differs from a temporary backend failure', async () => {
  assert.equal((await loadTalentAccess('/test', response(404, {}))).unavailable, true);
  const failed = await loadTalentAccess('/test', response(503, { unlocked: true, detail: { phone: 'DO-NOT-COPY' } }));
  assert.equal(failed.error, true);
  assert.equal(failed.unavailable, undefined);
  assert.equal(failed.detail, null);
});
test('network failure and malformed success remain retryable, never a purchase state', async () => {
  for (const request of [async () => { throw new Error('offline'); }, async () => new Response('<html>error</html>'), response(200, null), response(200, {}), response(200, { unlocked: true, detail: null })]) {
    const result = await loadTalentAccess('/test', request);
    assert.equal(result.error, true);
    assert.equal(result.detail, null);
  }
});
test('session and role rejection cannot expose response details', async () => {
  for (const status of [401, 403]) {
    const result = await loadTalentAccess('/test', response(status, { unlocked: true, detail: { phone: 'DO-NOT-COPY' } }));
    assert.equal(result.error, true);
    assert.equal(result.unlocked, false);
    assert.equal(result.detail, null);
  }
});
test('daily limit keeps its specific guidance', async () => {
  const result = await loadTalentAccess('/test', response(429, { limited: true, message: '오늘 한도' }));
  assert.equal(result.limited, true);
  assert.equal(result.message, '오늘 한도');
});
test('detail requests bypass caches and carry current session plus cancellation', async () => {
  const controller = new AbortController();
  await loadTalentAccess('/api/talent-detail/seeker-test', async (url, options) => {
    assert.equal(url, '/api/talent-detail/seeker-test');
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.signal, controller.signal);
    return new Response(JSON.stringify({ unlocked: false, detail: null }));
  }, controller.signal);
});
