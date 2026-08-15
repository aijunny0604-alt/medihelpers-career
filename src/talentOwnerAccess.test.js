import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { operationalTalent } from './siteOperations.js';

test('a signed-in author receives an owner-only marker for their published job-seeker post', () => {
  const [person] = operationalTalent([{
    id: 'resume-owned',
    contentType: 'talent_profile',
    payload: { code: 'MH-OWNED', fromResume: true, ownerView: true }
  }]);

  assert.equal(person.ownerView, true);
  assert.equal(person.detailId, 'resume-owned');
});

test('the server unlocks only the matching resume owner without spending a hospital ticket', async () => {
  const server = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
  const page = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');

  assert.match(server, /resumeMeta\?\.accountId === account\.id/);
  assert.match(server, /let hasUnlock = Boolean\(isAdmin \|\| isOwner\)/);
  assert.match(server, /if \(!hasUnlock && account\?\.role === 'hospital'\)/);
  assert.match(server, /const accessReason = isOwner \? 'owner'/);
  assert.match(server, /account_id = \? OR \? = 1 OR visibility IN/);
  assert.match(page, /내 글 · 무료/);
  assert.match(page, /ownerAccess \? 'MY POST · 작성자 무료 열람'/);
  assert.match(page, /to="\/resume">내 구직글 수정/);
});
