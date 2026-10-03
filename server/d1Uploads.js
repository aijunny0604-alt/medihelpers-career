// A small, bounded upload store. This is not a destination for database backups.
export function createD1UploadStorage(db) {
  const maxFile=10*1024*1024, chunkSize=1024*1024;
  const keyCheck=key=>{
    if(typeof key!=='string'||key.length>500||key.includes('..')||! /^(hospitals|profiles|verifications\/hospitals)\/[A-Za-z0-9_/-]+\.[a-z0-9]+$/.test(key)) throw Error('UPLOAD_KEY_INVALID');
  };
  const sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  return {
    async put(key,value,options={}) {
      keyCheck(key);
      const bytes=value instanceof ArrayBuffer?new Uint8Array(value):ArrayBuffer.isView(value)?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):null;
      if(!bytes?.length||bytes.length>maxFile)throw Error('UPLOAD_SIZE_INVALID');
      const metadata=JSON.stringify({httpMetadata:options.httpMetadata||{},customMetadata:options.customMetadata||{}});
      if(new TextEncoder().encode(metadata).length>4096)throw Error('UPLOAD_METADATA_INVALID');
      const digest=await sha(bytes);
      const statements=[db.prepare('INSERT INTO upload_objects (object_key,size,sha256,metadata_json) VALUES (?,?,?,?)').bind(key,bytes.length,digest,metadata)];
      for(let offset=0,n=0;offset<bytes.length;offset+=chunkSize,n++)statements.push(db.prepare('INSERT INTO upload_chunks (object_key,chunk_index,body) VALUES (?,?,?)').bind(key,n,bytes.slice(offset,offset+chunkSize).buffer));
      // D1 batch is transactional. Quota trigger and all chunks commit together.
      await db.batch(statements);
      return {key,size:bytes.length};
    },
    async get(key) {
      keyCheck(key);
      const meta=await db.prepare('SELECT * FROM upload_objects WHERE object_key=?').bind(key).first();
      if(!meta)return null;
      if(!Number.isSafeInteger(meta.size)||meta.size<1||meta.size>maxFile)throw Error('UPLOAD_CORRUPT');
      const result=await db.prepare('SELECT chunk_index,body FROM upload_chunks WHERE object_key=? ORDER BY chunk_index').bind(key).all();
      const rows=result.results||[],bytes=new Uint8Array(meta.size);let offset=0;
      if(rows.length!==Math.ceil(meta.size/chunkSize))throw Error('UPLOAD_CORRUPT');
      for(let n=0;n<rows.length;n++){
        const row=rows[n],part=new Uint8Array(row.body);
        if(row.chunk_index!==n||part.length!==Math.min(chunkSize,meta.size-offset))throw Error('UPLOAD_CORRUPT');
        bytes.set(part,offset);offset+=part.length;
      }
      if(await sha(bytes)!==meta.sha256)throw Error('UPLOAD_CORRUPT');
      return {key,size:meta.size,uploaded:new Date(meta.uploaded_at+'Z'),...JSON.parse(meta.metadata_json),body:bytes};
    },
    async delete(key) {
      keyCheck(key);
      await db.batch([db.prepare('DELETE FROM upload_chunks WHERE object_key=?').bind(key),db.prepare('DELETE FROM upload_objects WHERE object_key=?').bind(key)]);
    },
    async list({prefix='',limit=1000,cursor=''}={}) {
      if(typeof prefix!=='string'||typeof cursor!=='string'||prefix.length>500||cursor.length>500)throw Error('UPLOAD_LIST_INVALID');
      const size=Math.min(1000,Math.max(1,Math.floor(Number(limit)||1000)));
      const result=await db.prepare('SELECT object_key,size,uploaded_at,metadata_json FROM upload_objects WHERE substr(object_key,1,?)=? AND object_key>? ORDER BY object_key LIMIT ?').bind(prefix.length,prefix,cursor,size+1).all();
      const rows=result.results||[],truncated=rows.length>size,selected=rows.slice(0,size);
      return {objects:selected.map(row=>({key:row.object_key,size:row.size,uploaded:new Date(row.uploaded_at+'Z'),...JSON.parse(row.metadata_json)})),truncated,cursor:truncated?selected.at(-1).object_key:undefined};
    }
  };
}
