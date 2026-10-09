// No network or remote writes. Private source data and report remain outside Git.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {applyProtectedMediaPlan} from './lib/protected-media-plan.mjs';
const [snapshotPath,planPath,reportPath]=process.argv.slice(2);
if(!snapshotPath||!planPath||!reportPath)throw Error('Usage: node scripts/rehearse-legacy-media.mjs PRIVATE_SNAPSHOT PRIVATE_PLAN PRIVATE_REPORT');
const repo=fileURLToPath(new URL('../',import.meta.url));
const rel=relative(repo,resolve(reportPath));
if(!rel||(!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..\\')&&!rel.startsWith('../')))throw Error('Private report must stay outside repository');
const hash=value=>createHash('sha256').update(value).digest('hex');
const snapshot=await readFile(snapshotPath),planBytes=await readFile(planPath),plan=JSON.parse(planBytes);
assert.equal(plan.kind,'offline-protected-media-plan');assert.equal(plan.changedRecords,plan.changes.length);
assert.ok(plan.changes.length>1,'Need multiple rows for atomic conflict rehearsal');
const manifest=JSON.parse(await readFile(new URL('./legacy-media-manifest.json',import.meta.url),'utf8'));
const known=new Set();
for(const item of manifest){
  assert.match(item.assetPath,/^\/legacy-media\/[a-f0-9]{64}\.(png|jpg|jpeg|gif|webp|bmp)$/);
  const bytes=await readFile(new URL('../public'+item.assetPath,import.meta.url));
  assert.equal(hash(bytes),item.sha256);assert.equal(bytes.length,item.bytes);known.add(item.assetPath);
}
for(const c of plan.changes){
  const p=JSON.parse(c.payloadJson);
  for(const field of ['banner','logo','facilityPhotos','posterImages']){
    const paths=Array.isArray(p[field])?p[field]:p[field]?[p[field]]:[];
    for(const path of paths)assert.ok(known.has(path),'Unverified media');
  }
}
const db=new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=OFF');db.exec(snapshot.toString());
assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);db.exec('PRAGMA foreign_keys=ON');
const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(x=>x.name);
const state=()=>Object.fromEntries(tables.map(name=>[name,hash(JSON.stringify(db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'"').all().map(r=>JSON.stringify(r)).sort()))]));
const original=state(),last=plan.changes.at(-1);
applyProtectedMediaPlan(db,plan.changes);
const applied=state();
for(const name of tables.filter(x=>x!=='admin_content_records'))assert.equal(applied[name],original[name]);
assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
applyProtectedMediaPlan(db,plan.changes,true);assert.deepEqual(state(),original);
// A stale final row must roll back all earlier updates, preserving the external edit.
db.prepare('UPDATE admin_content_records SET subtitle=? WHERE id=?').run('REHEARSAL EDIT',last.id);
const edited=state();assert.throws(()=>applyProtectedMediaPlan(db,plan.changes),/Protected media conflict/);assert.deepEqual(state(),edited);
db.prepare('UPDATE admin_content_records SET subtitle=? WHERE id=?').run(last.expectedSubtitle,last.id);
assert.deepEqual(state(),original);
applyProtectedMediaPlan(db,plan.changes);
db.prepare("UPDATE admin_content_records SET status='published' WHERE id=?").run(last.id);
const published=state();assert.throws(()=>applyProtectedMediaPlan(db,plan.changes,true),/Protected media conflict/);assert.deepEqual(state(),published);
db.prepare("UPDATE admin_content_records SET status='draft' WHERE id=?").run(last.id);
applyProtectedMediaPlan(db,plan.changes,true);assert.deepEqual(state(),original);db.close();
const report={createdAt:new Date().toISOString(),snapshotSha256:hash(snapshot),planSha256:hash(planBytes),tables:tables.length,assets:known.size,changes:plan.changes.length,held:plan.held.length,applyRollbackExact:true,otherTablesUnchanged:true,staleApplyAtomic:true,changedRollbackAtomic:true,remoteWrites:false,readyForRemoteExecution:false};
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
