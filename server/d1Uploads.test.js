import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createD1UploadStorage} from './d1Uploads.js';
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');sql.exec(readFileSync(new URL('../drizzle/0021_bounded_uploads.sql',import.meta.url),'utf8'));
 const wrap=(query,args=[])=>({bind(...values){return wrap(query,values.map(v=>v instanceof ArrayBuffer?new Uint8Array(v):v));},async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){return sql.prepare(query).run(...args);}});
 const db={prepare:wrap,async batch(statements){sql.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 return {sql,storage:createD1UploadStorage(db)};
}
for(const size of [1,1024*1024,1024*1024+1,5*1024*1024,10*1024*1024])test('round trip '+size,async()=>{
 const {sql,storage}=fixture(),bytes=new Uint8Array(size).fill(37),key='profiles/owner/photo/file.png';
 await storage.put(key,bytes,{httpMetadata:{contentType:'image/png'},customMetadata:{purpose:'test'}});
 const got=await storage.get(key);assert.deepEqual(got.body,bytes);assert.equal(got.httpMetadata.contentType,'image/png');
 assert.equal(sql.prepare('SELECT count(*) n FROM upload_chunks').get().n,Math.ceil(size/(1024*1024)));
 await storage.delete(key);assert.equal(await storage.get(key),null);assert.equal(sql.prepare('SELECT count(*) n FROM upload_chunks').get().n,0);
});
for(const key of ['../x','profiles/../x.png','verifications/x.pdf','backups/private.sql','hospitals/x/evil.svg?x'])test('reject path '+key,async()=>{await assert.rejects(fixture().storage.put(key,new Uint8Array([1])),/KEY_INVALID/);});
test('reject empty, oversized and invalid metadata',async()=>{const {storage}=fixture();for(const value of [new Uint8Array(),new Uint8Array(10485761),'text'])await assert.rejects(storage.put('hospitals/a/x.png',value),/SIZE_INVALID/);await assert.rejects(storage.put('hospitals/a/x.png',new Uint8Array([1]),{customMetadata:{large:'x'.repeat(5000)}}),/METADATA_INVALID/);});
test('collision cannot replace old file and batch rollback leaves no chunks',async()=>{const {storage,sql}=fixture();await storage.put('hospitals/a/x.png',new Uint8Array([1]));await assert.rejects(storage.put('hospitals/a/x.png',new Uint8Array([2])));assert.deepEqual((await storage.get('hospitals/a/x.png')).body,new Uint8Array([1]));assert.equal(sql.prepare('SELECT count(*) n FROM upload_chunks').get().n,1);});
test('chunk failure rolls back metadata and every chunk',async()=>{const {storage,sql}=fixture();sql.exec("CREATE TRIGGER fail_second BEFORE INSERT ON upload_chunks WHEN NEW.chunk_index=1 BEGIN SELECT RAISE(ABORT,'synthetic failure'); END;");await assert.rejects(storage.put('profiles/a/x.png',new Uint8Array(1048577)),/synthetic/);assert.equal(sql.prepare('SELECT count(*) n FROM upload_objects').get().n,0);assert.equal(sql.prepare('SELECT count(*) n FROM upload_chunks').get().n,0);});
test('quota fails closed and deleting releases capacity',async()=>{const {storage,sql}=fixture();for(let i=0;i<10;i++)sql.prepare('INSERT INTO upload_objects(object_key,size,sha256,metadata_json) VALUES(?,10485760,?,?)').run('hospitals/x/'+i+'.png','synthetic','{}');await assert.rejects(storage.put('hospitals/x/new.png',new Uint8Array([1])),/QUOTA/);assert.equal(sql.prepare('SELECT count(*) n FROM upload_chunks').get().n,0);await storage.delete('hospitals/x/0.png');await storage.put('hospitals/x/new.png',new Uint8Array([1]));});
for(const corruption of ['missing','content'])test('reject corruption '+corruption,async()=>{const {storage,sql}=fixture();await storage.put('profiles/a/x.png',new Uint8Array([1,2]));sql.exec(corruption==='missing'?'DELETE FROM upload_chunks':"UPDATE upload_chunks SET body=X'0201'");await assert.rejects(storage.get('profiles/a/x.png'),/CORRUPT/);});
test('prefix pagination is literal and excludes blobs',async()=>{const {storage}=fixture();for(const key of ['profiles/a/a.png','profiles/a/b.png','profiles/b/a.png'])await storage.put(key,new Uint8Array([1]));const p=await storage.list({prefix:'profiles/a/',limit:1});assert.equal(p.truncated,true);assert.equal(p.objects[0].body,undefined);const next=await storage.list({prefix:'profiles/a/',limit:1,cursor:p.cursor});assert.equal(next.objects[0].key,'profiles/a/b.png');assert.equal(next.truncated,false);assert.equal((await storage.list({prefix:'profiles/%'})).objects.length,0);});
