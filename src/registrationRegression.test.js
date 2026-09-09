import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { operationalDoctorJobs } from './siteOperations.js';

const source = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
const start = source.indexOf('async function ensureMemberCenterSchema(env)');
const code = source.slice(start, source.indexOf('async function ensureCommerceSchema', start));

for (const column of ['created_at', 'unlocked_at']) {
  test(`member center supports ${column} schema without losing dates`, async () => {
    const db = new DatabaseSync(':memory:');
    db.exec(`CREATE TABLE talent_unlocks (id TEXT, ${column} TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); INSERT INTO talent_unlocks VALUES ('existing','2026-08-01 10:30:00');`);
    const env = { DB:{ prepare(sql) { return {
      async all() { return { results:db.prepare(sql).all() }; },
      async first() { return db.prepare(sql).get() || null; },
      async run() { return db.prepare(sql).run(); }
    }; } } };
    const ensure = new Function('ensureSchemaGroup', 'schemaReadyPromises', 'memberCenterSchemaStatements', code + ';return ensureMemberCenterSchema;')(async()=>{}, new Map(), []);
    await Promise.all([ensure(env), ensure(env)]);
    await ensure(env);
    assert.equal(db.prepare('SELECT unlocked_at FROM talent_unlocks').get().unlocked_at, '2026-08-01 10:30:00');
    db.exec("INSERT INTO talent_unlocks (id) VALUES ('new')");
    assert.ok(db.prepare("SELECT unlocked_at FROM talent_unlocks WHERE id='new'").get().unlocked_at);
    db.close();
  });
}

test('registered hospital details and posting date reach the public job', () => {
  const [job] = operationalDoctorJobs([{ id:'qa', contentType:'doctor_job', title:'QA', subtitle:'QA 병원', createdAt:'2026-09-09 12:00:00', payload:{ website:'https://example.com', equipment:'초음파', staffCount:'30명', exposure:{start:'2026-09-10'}, banner:'/banners/templates/wellness-mint-v1.jpg', brandImageLayout:'template-overlay' } }]);
  assert.equal(job.website, 'https://example.com');
  assert.equal(job.equipment, '초음파');
  assert.equal(job.staffCount, '30명');
  assert.equal(job.postedDate, '2026-09-10');
  assert.equal(job.brandImageLayout, 'template-overlay');
});

test('optional salary never falls back to the recruitment specialty', () => {
  const [job] = operationalDoctorJobs([{ id:'basic', contentType:'doctor_job', payload:{ fromHospital:true, department:'가정의학과', secondary:'가정의학과', pay:'', salaryBasis:'' } }]);
  assert.equal(job.pay, '협의 후 결정');
});
