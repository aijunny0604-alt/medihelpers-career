// Verify archived public media in the Cloudflare build without contacting Rankup.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import worker from '../dist-cf/server/index.js';
const manifest=JSON.parse(await readFile(new URL('./legacy-media-manifest.json',import.meta.url),'utf8'));
const paths=new Set();
const assets={async fetch(request){
  const pathname=new URL(request.url).pathname;
  const item=manifest.find(entry=>entry.assetPath===pathname);
  if (!item) return new Response('Not Found',{status:404});
  return new Response(await readFile(new URL('../dist-cf/public'+pathname,import.meta.url)),{headers:{'content-type':item.mime}});
}};
let bytes=0;
for(const item of manifest){
  assert.match(item.assetPath,/^\/legacy-media\/[a-f0-9]{64}\.(png|jpg|jpeg|gif|webp|bmp)$/);
  assert.ok(!paths.has(item.assetPath)); paths.add(item.assetPath);
  const original=await readFile(new URL('../public'+item.assetPath,import.meta.url));
  assert.equal(original.length,item.bytes);
  assert.equal(createHash('sha256').update(original).digest('hex'),item.sha256);
  const response=await worker.fetch(new Request('https://independent.example'+item.assetPath),{ASSETS:assets},{});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),item.mime);
  const served=Buffer.from(await response.arrayBuffer());
  assert.deepEqual(served,original);
  bytes+=served.length;
}
console.log(JSON.stringify({assets:paths.size,bytes,sourceAndBuiltHashesVerified:true,rankupNetworkRequests:0,deployed:false}));
