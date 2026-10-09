// Offline preparation only. Private snapshots/plans must stay outside the repository.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {mapLegacyJobMedia} from '../src/legacyMediaMapping.js';
const [snapshotPath,placementPath,outputPath]=process.argv.slice(2);
if(!snapshotPath||!placementPath||!outputPath) throw Error('Usage: node scripts/prepare-legacy-media.mjs PRIVATE_SNAPSHOT PRIVATE_PLACEMENT PRIVATE_OUTPUT');
const repo=fileURLToPath(new URL('../',import.meta.url));
const rel=relative(repo,resolve(outputPath));
if(!rel||(!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..\\')&&!rel.startsWith('../'))) throw Error('Private output must be outside the repository');
const manifest=JSON.parse(await readFile(new URL('./legacy-media-manifest.json',import.meta.url),'utf8'));
const placements=JSON.parse(await readFile(placementPath,'utf8'));
assert.equal(placements.sourceRequestsFailed,0);
const db=new DatabaseSync(':memory:');
// Cloudflare exports may create referenced tables after their dependants.
// Disable FK enforcement only for the isolated import, then check all relations.
db.exec('PRAGMA foreign_keys=OFF');db.exec(await readFile(snapshotPath,'utf8'));
assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
db.exec('PRAGMA foreign_keys=ON');
const original=db.prepare('SELECT * FROM admin_content_records ORDER BY id').all();
const changes=[],held=[];const seen=new Set();
for(const placement of placements.records){
  assert.ok(!seen.has(placement.id));seen.add(placement.id);
  const record=db.prepare('SELECT id,subtitle,status,visibility,payload_json AS payloadJson FROM admin_content_records WHERE id=?').get(placement.id);
  assert.ok(record,'Missing record');
  try {
    // These two featured banner placements were observed on the original home page.
    const slot=['rankup-job-285','rankup-job-135'].includes(record.id)?'premium-banner':'';
    const result=mapLegacyJobMedia(record,placement,manifest,slot);
    if(result.changed) changes.push({...result,expectedSubtitle:record.subtitle,expectedPayloadJson:record.payloadJson});
  } catch(error){
    if(['LEGACY_OWNER_UNRESOLVED','LEGACY_SOURCE_UNAVAILABLE'].includes(error.message)) held.push({id:record.id,reason:error.message});
    else throw error;
  }
}
const update=db.prepare("UPDATE admin_content_records SET payload_json=?,subtitle=? WHERE id=? AND status='draft' AND visibility='admin' AND payload_json=? AND subtitle IS ?");
db.exec('BEGIN');
try{
  for(const change of changes)assert.equal(update.run(change.payloadJson,change.subtitle,change.id,change.expectedPayloadJson,change.expectedSubtitle).changes,1);
  // Reverting every update must reproduce all original content rows exactly.
  for(const change of [...changes].reverse())assert.equal(update.run(change.expectedPayloadJson,change.expectedSubtitle,change.id,change.payloadJson,change.subtitle).changes,1);
  assert.deepEqual(db.prepare('SELECT * FROM admin_content_records ORDER BY id').all(),original);
}finally{db.exec('ROLLBACK');db.close();}
const plan={preparedAt:new Date().toISOString(),kind:'offline-protected-media-plan',sourceCommit:'see Git history',
  readyForRemoteExecution:false,requires:['Fresh backup and revalidation','Deployed media paths verified','Atomic guarded application and affected-row validation'],
  checkedRecords:seen.size,changedRecords:changes.length,held,localApplyRollbackVerified:true,remoteWrites:false,changes};
await writeFile(outputPath,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({checkedRecords:seen.size,changedRecords:changes.length,held:held.length,localApplyRollbackVerified:true,remoteWrites:false}));
