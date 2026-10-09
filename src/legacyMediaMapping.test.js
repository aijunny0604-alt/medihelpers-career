import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapLegacyJobMedia} from './legacyMediaMapping.js';
const path=n=>'/legacy-media/'+String(n).repeat(64)+'.png';
const manifest=[1,2,3,4,5].map(n=>({assetPath:path(n),sha256:String(n).repeat(64)}));
const payload={description:'Keep original text',adTier:'featured',exposureEnd:'2030-01-01',migration:{ownerMapping:{accountId:'owner'},privateSource:'retained'}};
const record={id:'rankup-job-10',status:'draft',visibility:'admin',payloadJson:JSON.stringify(payload)};
const placement={id:record.id,sourceState:'available',roles:{logo:[path(1)],gallery:[path(2)],body:[path(3),path(4),path(5),path(2)]}};
test('maps all body images in order without the new-upload three-image truncation',()=>{
  const result=mapLegacyJobMedia(record,placement,manifest);
  const data=JSON.parse(result.payloadJson);
  assert.deepEqual(data.posterImages,placement.roles.body);
  assert.deepEqual(data.facilityPhotos,[path(2)]);
  for(const key of Object.keys(payload)) assert.deepEqual(data[key],payload[key]);
  assert.deepEqual(Object.keys(result.fields).sort(),['facilityPhotos','logo','posterImages']);
  assert.equal(record.payloadJson,JSON.stringify(payload));
});
test('banner slots use original full image without issuing advertising rights',()=>{
  const result=mapLegacyJobMedia(record,placement,manifest,'premium-banner');
  assert.equal(result.fields.banner,path(1));assert.equal(result.fields.brandImageLayout,'full-banner');
  assert.ok(!Object.hasOwn(result.fields,'adTier'));assert.ok(!Object.hasOwn(result.fields,'exposureEnd'));
});
test('rejects wrong record, public records and unresolved ownership',()=>{
  for(const change of [{id:'rankup-job-11'},{status:'published'},{visibility:'public'},{payloadJson:'{}'}])
    assert.throws(()=>mapLegacyJobMedia({...record,...change},placement,manifest));
});
test('rejects external or missing assets and ambiguous logo choices',()=>{
  for(const logo of [['https://old.invalid/logo.png'],[path(9)],[path(1),path(2)]])
    assert.throws(()=>mapLegacyJobMedia(record,{...placement,roles:{...placement.roles,logo}},manifest));
  assert.throws(()=>mapLegacyJobMedia(record,placement,manifest.map(x=>({...x,sha256:'bad'}))));
});
test('preserves existing edits and is idempotent for identical media',()=>{
  assert.throws(()=>mapLegacyJobMedia({...record,payloadJson:JSON.stringify({...payload,logo:'/new-logo.png'})},placement,manifest),/EDIT_CONFLICT/);
  const first=mapLegacyJobMedia(record,placement,manifest);
  const second=mapLegacyJobMedia({...record,payloadJson:first.payloadJson},placement,manifest);
  assert.equal(second.changed,false);
});
test('closed or unknown source pages cannot be revived by media preparation',()=>{
  for(const sourceState of ['closed','unknown',undefined]) assert.throws(()=>mapLegacyJobMedia(record,{...placement,sourceState},manifest),/SOURCE_UNAVAILABLE/);
});
test('fills an empty hospital name from exact source evidence without overwriting edits',()=>{
  const named={...placement,hospitalName:'합성 검수병원'};
  assert.equal(mapLegacyJobMedia(record,named,manifest).subtitle,'합성 검수병원');
  assert.throws(()=>mapLegacyJobMedia({...record,subtitle:'다른 병원'},named,manifest),/NAME_CONFLICT/);
});
