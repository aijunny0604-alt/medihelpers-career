import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('new doctor applications use the registered member profile name', async () => {
  const server = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');

  assert.match(server, /SELECT display_name AS displayName FROM member_profiles WHERE account_id = \? LIMIT 1/);
  assert.match(server, /requesterName = registeredName/);
  assert.match(server, /payload\.name = registeredName/);
  assert.match(server, /consultationInsert[\s\S]*requesterName/);
});

test('hospital inquiry history resolves legacy applicant names from the linked account', async () => {
  const server = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');

  assert.match(server, /applicant_member\.display_name/);
  assert.match(server, /applicant_account\.full_name/);
  assert.match(server, /json_extract\(cr\.payload_json,'\$\.resumeSnapshot\.name'\)/);
  assert.match(server, /LEFT JOIN member_profiles applicant_member ON applicant_member\.account_id=applicant_account\.account_id/);
});
