// Prepare four protected drafts; SQL/data output is private and never publishes.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {mapLegacyJobMedia} from '../src/legacyMediaMapping.js';
import {mapLegacyAdService} from '../src/legacyAdServiceMapping.js';
const root=resolve(process.argv[2]||'');
const repo=fileURLToPath(new URL('../',import.meta.url));
const rel=relative(repo,root);assert.ok(rel&&(isAbsolute(rel)||rel==='..'||rel.startsWith('..\\')||rel.startsWith('../')),'Private directory required');
const read=async n=>JSON.parse(await readFile(resolve(root,n),'utf8'));
const snapshot=await readFile(resolve(root,'before-featured-map-20261009.sql'),'utf8');
const placements=await read('all-job-placement-plan-20261009.json');
const observations=await read('live-ad-services-20261009-private.json');
const manifest=JSON.parse(await readFile(new URL('./legacy-media-manifest.json',import.meta.url),'utf8'));
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=OFF');db.exec(snapshot);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);db.exec('PRAGMA foreign_keys=ON');
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
const changes=[];
for(const sourceId of ['285','135','324','296']) {
 const id='rankup-job-'+sourceId;
 const record=db.prepare('SELECT id,subtitle,status,visibility,payload_json AS payloadJson FROM admin_content_records WHERE id=?').get(id);
 const placement=placements.records.find(r=>r.id===id),observation=observations.records.find(r=>r.sourceId===sourceId);
 assert.ok(record&&placement&&observation);
 // Legacy premium slots contain portrait/square logo art, not wide banner art.
 // Use the contain-based logo layout so the hospital identity is not cropped.
 const media=mapLegacyJobMedia(record,placement,manifest,'');
 const payload=mapLegacyAdService({...record,payloadJson:media.payloadJson},observation);
 changes.push({id,subtitle:media.subtitle,payloadJson:JSON.stringify(payload),before:record,sourceId});
}
const update=(c,reverse=false)=>{
 const target=reverse?c.before:c,expected=reverse?c:c.before;
 return `UPDATE admin_content_records SET subtitle=${quote(target.subtitle)},payload_json=${quote(target.payloadJson)} WHERE id=${quote(c.id)} AND status='draft' AND visibility='admin' AND subtitle IS ${quote(expected.subtitle)} AND payload_json=${quote(expected.payloadJson)};\n`+
 // A stale draft aborts the transaction via a NOT NULL constraint, never overwrites edits.
 "INSERT INTO accounts(id,user_key,role) SELECT NULL,NULL,'doctor' WHERE changes()<>1;";
};
const sql=changes.map(c=>update(c)).join('\n'),reverse=[...changes].reverse().map(c=>update(c,true)).join('\n');
const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
const state=()=>JSON.stringify(tables.map(t=>[t,db.prepare('SELECT * FROM "'+t+'"').all().map(r=>JSON.stringify(r)).sort()]));
const original=state();db.exec('BEGIN;'+sql+'COMMIT;');db.exec('BEGIN;'+reverse+'COMMIT;');assert.equal(state(),original);
db.prepare('UPDATE admin_content_records SET subtitle=? WHERE id=?').run('LOCAL CONFLICT',changes.at(-1).id);
const conflict=state();assert.throws(()=>db.exec('BEGIN;'+sql+'COMMIT;'));db.exec('ROLLBACK');assert.equal(state(),conflict);
for(const [name,content] of [['featured-map-apply.sql',sql],['featured-map-reverse-rehearsal.sql',reverse],['featured-map-plan-private.json',JSON.stringify({changes,snapshotSha256:createHash('sha256').update(snapshot).digest('hex'),tablesChecked:tables.length,rollbackVerified:true,staleEditAtomicAbortVerified:true},null,2)]])await writeFile(resolve(root,name),content+'\n',{flag:'wx'});
console.log(JSON.stringify({drafts:changes.length,tablesChecked:tables.length,rollbackVerified:true,staleEditAtomicAbortVerified:true,remoteWrites:false}));
