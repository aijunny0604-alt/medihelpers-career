import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { adminConsoleSchemaStatements } from '../db/schema.js';

test('Sites는 기존 D1 바인딩을 유지하고 별도 R2 백업 저장소를 사용한다', async () => {
  const hosting = JSON.parse(await readFile(new URL('../.openai/hosting.json', import.meta.url), 'utf8'));
  assert.equal(hosting.project_id, 'appgprj_6a55ef0d235881919bf6cbd7919e0355');
  assert.equal(hosting.d1, 'DB');
  assert.equal(hosting.r2, 'BACKUPS');
});

test('백업과 보존 정리 실행 이력을 D1에 기록한다', () => {
  const schema = adminConsoleSchemaStatements.join('\n');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS data_protection_runs/);
  assert.match(schema, /run_type TEXT NOT NULL/);
  assert.match(schema, /object_key TEXT NOT NULL/);
  assert.match(schema, /checksum TEXT NOT NULL/);
});

test('서버는 매일 R2 백업을 만들고 SHA-256 무결성을 기록한다', async () => {
  const source = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
  assert.match(source, /env\.BACKUPS\.put/);
  assert.match(source, /BACKUP_CHECKSUM_MISMATCH/);
  assert.match(source, /backupRetentionDays = 35/);
  assert.match(source, /checksum = await authSha256Hex\(payload\)/);
  assert.match(source, /runDailyDataProtection/);
  assert.match(source, /data_protection_daily_claim/);
  assert.match(source, /excludedTables:\['auth_sessions'\]/);
});

test('탈퇴 시 결제 보존 여부와 관계없이 이력서와 회원 활동을 제거한다', async () => {
  const source = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
  const billingBranch = source.slice(source.indexOf("if (Number(billing?.total || 0) > 0)"), source.indexOf("return json({ deleted:true, retainedForBilling:true"));
  assert.match(billingBranch, /DELETE FROM resumes WHERE account_id/);
  assert.match(billingBranch, /DELETE FROM saved_jobs WHERE account_id/);
  assert.match(billingBranch, /DELETE FROM member_activity WHERE account_id/);
  assert.match(billingBranch, /DELETE FROM consent_records WHERE account_id/);
  assert.match(billingBranch, /DELETE FROM talent_credit_pools WHERE hospital_account_id/);
});

test('보유기간 만료 정리는 탈퇴 30일, 상담 3년, 거래 5년 기준을 사용한다', async () => {
  const source = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
  assert.match(source, /withdrawn_at < datetime\('now','-30 days'\)/);
  assert.match(source, /consultation_requests WHERE status='closed'.*'-3 years'/);
  assert.match(source, /payment_orders WHERE status IN .*'-5 years'/);
  assert.match(source, /payment_orders WHERE status='paid'.*'-5 years'/);
});
