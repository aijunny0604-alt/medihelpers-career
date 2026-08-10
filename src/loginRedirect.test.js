import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveLoginDestination } from './loginRedirect.js';

test('login returns to an explicit safe page and no longer defaults members to mypage', () => {
  assert.equal(resolveLoginDestination({ search:'?next=%2Fjobs%2Fdoctor-1%3Ffrom%3Dhome', role:'doctor' }), '/jobs/doctor-1?from=home');
  assert.equal(resolveLoginDestination({ role:'doctor' }), '/');
  assert.equal(resolveLoginDestination({ role:'hospital' }), '/');
  assert.equal(resolveLoginDestination({ role:'admin' }), '/admin/console');
  assert.equal(resolveLoginDestination({ search:'?next=https%3A%2F%2Fevil.example', role:'doctor' }), '/');
  assert.equal(resolveLoginDestination({ search:'?next=%2F%2Fevil.example', role:'doctor' }), '/');
});

test('login can recover a same-origin previous page and header always supplies the current route', async () => {
  assert.equal(resolveLoginDestination({
    referrer:'https://medihelpers-career.junnyai.chatgpt.site/medical-staff?region=busan',
    origin:'https://medihelpers-career.junnyai.chatgpt.site',
    role:'doctor'
  }), '/medical-staff?region=busan');
  assert.equal(resolveLoginDestination({
    referrer:'https://other.example/jobs',
    origin:'https://medihelpers-career.junnyai.chatgpt.site',
    role:'doctor'
  }), '/');
  assert.equal(resolveLoginDestination({
    referrer:'https://medihelpers-career.junnyai.chatgpt.site/login?next=/mypage',
    origin:'https://medihelpers-career.junnyai.chatgpt.site',
    role:'doctor'
  }), '/');

  const mainSource = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  assert.match(mainSource, /`\/login\?next=\$\{encodeURIComponent\(loginReturnTo\)\}`/);
});
