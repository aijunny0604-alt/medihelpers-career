import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SAMPLE_BANNER_TEMPLATES } from './bannerTemplates.js';

const source = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
const branch = source.slice(source.indexOf("if (body.action === 'owned_ad_update')"), source.indexOf("if (body.action === 'refund_request')"));
const execute = new (Object.getPrototypeOf(async function() {}).constructor)('body', 'account', 'env', 'identity', 'parseJsonObject', 'json', branch);

test('owner banner changes persist template, upload and removal while preserving the ad contract', async () => {
  let payload = { adTier:'featured', exposureEnd:'2026-12-31', banner:'/old.jpg', brandImageLayout:'full-banner' };
  const batches = [];
  const env = { DB:{ prepare(sql) { return { bind(...values) { return { sql, values, async first() { return { payloadJson:JSON.stringify(payload), status:'published', contentType:'doctor_job' }; } }; } }; }, async batch(statements) { batches.push(statements); payload = JSON.parse(statements[0].values[2]); } } };
  for (const choice of [...SAMPLE_BANNER_TEMPLATES.map(t => ({ banner:t.src, brandImageLayout:'template-overlay' })), { banner:'/api/job-images/new.png', brandImageLayout:'full-banner' }, { banner:'', brandImageLayout:'' }]) {
    const result = await execute({ action:'owned_ad_update', contentRecordId:'my-ad', content:{ title:'의사 초빙', hospital:'테스트 병원', ...choice } }, { role:'hospital', id:'owner' }, env, { email:'test@example.com' }, JSON.parse, value => value);
    assert.equal(result.updated, true);
    assert.equal(payload.banner, choice.banner);
    assert.equal(payload.brandImageLayout, choice.brandImageLayout);
    assert.equal(payload.adTier, 'featured');
    assert.equal(payload.exposureEnd, '2026-12-31');
    const metadataUpdate = batches.at(-1)[1];
    assert.match(metadataUpdate.sql, /UPDATE payment_orders SET metadata_json=json_set/);
    assert.deepEqual(metadataUpdate.values.slice(0, 3), [choice.banner, choice.brandImageLayout, choice.brandImageLayout === 'full-banner' ? choice.banner : '']);
  }
});
