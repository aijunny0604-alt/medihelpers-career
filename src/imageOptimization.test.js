import test from 'node:test';
import assert from 'node:assert/strict';
import { createImageOptimizer, imageOutputSize, IMAGE_SOURCE_MAX_BYTES, IMAGE_OUTPUT_MAX_BYTES } from './imageOptimization.js';
import { inspectUploadImage } from '../server/uploadImageValidation.js';

const file = (type = 'image/png', size = 32) => new File([new Uint8Array(size)], '원본.png', { type });
function harness({ width = 3600, height = 1600, decode, encode, inspect } = {}) {
  const calls = { decode:0, close:0, encode:[] };
  const optimize = createImageOptimizer({
    inspect:inspect || (() => ({ width, height })),
    decode:decode || (async () => { calls.decode++; return { width, height, close:() => calls.close++ }; }),
    encode:async (...args) => { calls.encode.push(args.slice(1)); return encode ? encode(...args) : new Blob(['pixels'], { type:args[3] }); },
  });
  return { calls, optimize };
}

test('용도별 긴 변과 원본 비율을 유지하며 작은 이미지를 확대하지 않는다', () => {
  for (const [purpose, limit] of [['logo',1200],['banner',2400],['facility',2048],['poster',4000]]) {
    const out = imageOutputSize(6000, 3000, purpose);
    assert.deepEqual(out, { width:limit, height:limit / 2 });
    assert.deepEqual(imageOutputSize(200,100,purpose), { width:200, height:100 });
  }
  assert.deepEqual(imageOutputSize(1000,1800,'banner'), { width:1000,height:1800 });
});
test('32MP 초과, 24000px 초과, 잘못된 치수를 차단한다', () => {
  for (const [w,h] of [[8000,4001],[24001,1],[0,10],[NaN,10],[1.5,10]]) assert.throws(() => imageOutputSize(w,h,'banner'));
  assert.deepEqual(imageOutputSize(8000,4000,'banner'), { width:2400,height:1200 });
});
test('원본 20MB까지 받아 최적화하고 20MB 초과는 디코드 전에 거부한다', async () => {
  const { optimize, calls } = harness();
  const source = { type:'image/png',name:'large.png',size:IMAGE_SOURCE_MAX_BYTES,arrayBuffer:async () => new ArrayBuffer(16) };
  const result = await optimize(source,'banner');
  assert.equal(result.width,2400); assert.equal(result.height,1067);
  assert.ok(result.file.size <= IMAGE_OUTPUT_MAX_BYTES);
  await assert.rejects(optimize({ ...source, size:IMAGE_SOURCE_MAX_BYTES+1 },'banner'), /20MB/);
  assert.equal(calls.decode,1);
});
test('GIF, SVG, 빈 파일, 파일이 아닌 입력을 거부한다', async () => {
  const { optimize,calls } = harness();
  for (const source of [file('image/gif'),file('image/svg+xml'),file('image/png',0),null,{}]) await assert.rejects(optimize(source));
  assert.equal(calls.decode,0);
});
test('구조 검사가 실패하면 브라우저 디코드를 실행하지 않는다', async () => {
  const { optimize,calls } = harness({ inspect:() => null });
  await assert.rejects(optimize(file()),/파일 내용/);
  assert.equal(calls.decode,0);
});
test('헤더가 유효해도 실제 디코드 실패는 전송용 파일을 만들지 않는다', async () => {
  const { optimize,calls } = harness({ decode:async () => { throw new Error('손상된 이미지'); } });
  await assert.rejects(optimize(file()),/손상/); assert.equal(calls.encode.length,0);
});
test('디코드 결과의 과도한 해상도도 거부하고 디코드 자원을 해제한다', async () => {
  let closed = 0;
  const { optimize } = harness({ decode:async () => ({ width:9000,height:4000,close:() => closed++ }) });
  await assert.rejects(optimize(file()),/3,200만/); assert.equal(closed,1);
});
test('PNG 로고를 무손실 PNG로 줄이며 투명도를 없애는 JPEG 변환을 하지 않는다', async () => {
  const { optimize,calls } = harness({ width:1800,height:1200 });
  const result = await optimize(file(),'logo');
  assert.deepEqual(calls.encode[0].slice(0,3),[1200,800,'image/png']);
  assert.equal(result.file.type,'image/png'); assert.equal(result.file.name,'원본.png'); assert.equal(calls.close,1);
});
test('큰 PNG는 같은 치수의 고품질 WebP를 먼저 시도해 알파를 유지한다', async () => {
  const { optimize,calls } = harness({ encode:async (_,w,h,type) => new Blob([new Uint8Array(type === 'image/png' ? IMAGE_OUTPUT_MAX_BYTES+1 : 40)], { type }) });
  const result = await optimize(file(),'banner');
  assert.deepEqual(calls.encode.map(([w,h,type]) => [w,h,type]), [[2400,1067,'image/png'],[2400,1067,'image/webp']]);
  assert.equal(calls.encode[1][3],0.9); assert.equal(result.file.type,'image/webp');
});
test('사진 압축은 높은 품질을 유지하고 용량 초과 시 치수를 줄인다', async () => {
  let encoded = 0;
  const { optimize,calls } = harness({ encode:async (_,w,h,type) => new Blob([new Uint8Array(++encoded === 1 ? IMAGE_OUTPUT_MAX_BYTES+1 : 50)], { type }) });
  const result = await optimize(file('image/jpeg'),'facility');
  assert.ok(calls.encode[1][0] < calls.encode[0][0]);
  assert.ok(calls.encode.every((entry) => entry[3] >= 0.9));
  assert.equal(result.width,calls.encode[1][0]); assert.equal(result.file.type,'image/jpeg');
});
test('5회 처리 후에도 5MB를 넘으면 성공 처리하지 않는다', async () => {
  const { optimize,calls } = harness({ encode:async (_,w,h,type) => ({ size:IMAGE_OUTPUT_MAX_BYTES+1,type }) });
  await assert.rejects(optimize(file()),/5MB/); assert.equal(calls.encode.length,5); assert.equal(calls.close,1);
});
test('빈 변환 결과나 지원하지 않는 변환 결과는 실패한다', async () => {
  for (const blob of [null,new Blob([],{type:'image/png'}),new Blob(['x'],{type:'image/gif'})]) {
    const { optimize,calls } = harness({ encode:async () => blob });
    await assert.rejects(optimize(file()),/변환/); assert.equal(calls.close,1);
  }
});
test('동일 원본의 중복 선택과 준비된 파일 제출은 디코드·압축을 한 번만 한다', async () => {
  const { optimize,calls } = harness(); const source = file();
  const [a,b] = await Promise.all([optimize(source,'banner'),optimize(source,'banner')]);
  assert.equal(a,b); assert.equal(await optimize(a.file,'banner'),a);
  assert.equal(calls.decode,1); assert.equal(calls.encode.length,1);
});
test('용도가 달라지면 별도 크기로 처리한다', async () => {
  const { optimize,calls } = harness(); const source = file();
  const logo = await optimize(source,'logo'); const banner = await optimize(source,'banner');
  assert.equal(logo.width,1200); assert.equal(banner.width,2400); assert.equal(calls.decode,2);
});
test('실패한 디코드는 캐시하지 않아 같은 파일을 다시 선택할 수 있다', async () => {
  let attempt = 0;
  const { optimize } = harness({ decode:async () => { if (++attempt === 1) throw new Error('첫 실패'); return { width:100,height:100 }; } });
  const source = file(); await assert.rejects(optimize(source));
  assert.equal((await optimize(source)).width,100); assert.equal(attempt,2);
});
test('EXIF 회전으로 헤더와 디코드 가로세로가 달라도 회전된 픽셀 비율을 사용한다', async () => {
  const { optimize,calls } = harness({ width:800,height:400,decode:async () => ({ width:400,height:800 }) });
  const result = await optimize(file('image/jpeg'),'banner');
  assert.deepEqual(calls.encode[0].slice(0,2),[400,800]);
  assert.equal(result.originalWidth,400); assert.equal(result.originalHeight,800);
});
test('작은 원본은 복원 불가 안내를 보여주고 허위 선명도 향상을 주장하지 않는다', async () => {
  const { optimize } = harness({ width:200,height:100 });
  assert.match((await optimize(file(),'logo')).notice,/복원할 수 없습니다/);
  const banner = await optimize(file(),'banner'); assert.match(banner.notice,/200×100px/); assert.equal(banner.width,200);
});

const smallRgbaPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAHUlEQVR4nGOUDFiQwgAFTAwMDAzP1sfPYWBgYAAAMnYEAesmgVEAAAAASUVORK5CYII=','base64');
function pngChunk(kind,payload) {
  const body=Buffer.concat([Buffer.from(kind),Buffer.from(payload)]), chunk=Buffer.alloc(body.length+8);
  chunk.writeUInt32BE(payload.length,0); body.copy(chunk,4);
  let crc=0xffffffff;
  for(const byte of body) { crc^=byte; for(let i=0;i<8;i++) crc=(crc&1) ? 0xedb88320^(crc>>>1) : crc>>>1; }
  chunk.writeUInt32BE((crc^0xffffffff)>>>0,chunk.length-4);
  return chunk;
}
const annotatedPng=(...chunks)=>Buffer.concat([smallRgbaPng.subarray(0,33),...chunks,smallRgbaPng.subarray(33)]);
function smallPngHarness(options={}) {
  return harness({width:3,height:2,inspect:inspectUploadImage,...options});
}

test('해독한 작은 정적 PNG는 픽셀·알파 바이트 그대로 유지하고 불필요한 재인코딩을 생략한다',async()=>{
  const {optimize,calls}=smallPngHarness();
  const source=new File([smallRgbaPng],'transparent.png',{type:'image/png'});
  const result=await optimize(source,'logo');
  assert.equal(result.bytes,source.size);assert.deepEqual(Buffer.from(await result.file.arrayBuffer()),smallRgbaPng);
  assert.deepEqual([result.width,result.height],[3,2]);assert.equal(calls.decode,1);assert.equal(calls.encode.length,0);assert.equal(calls.close,1);
  assert.equal(await optimize(result.file,'logo'),result);assert.equal(calls.decode,1);
});
test('작은 PNG의 텍스트·작성 시각은 제거하고 압축 픽셀은 유지한다',async()=>{
  const annotated=annotatedPng(...['tEXt','zTXt','iTXt','tIME'].map(kind=>pngChunk(kind,Buffer.from('synthetic-private-metadata'))));
  const {optimize,calls}=smallPngHarness();
  const result=await optimize(new File([annotated],'private.png',{type:'image/png'}),'banner');
  assert.deepEqual(Buffer.from(await result.file.arrayBuffer()),smallRgbaPng);
  assert.ok(result.bytes<annotated.length);assert.equal(calls.encode.length,0);
});
test('PNG 색상·해상도 청크는 픽셀과 함께 보존한다',async()=>{
  const gamma=Buffer.alloc(4);gamma.writeUInt32BE(45455);
  const density=Buffer.alloc(9);density.writeUInt32BE(3780);density.writeUInt32BE(3780,4);density[8]=1;
  const original=annotatedPng(pngChunk('gAMA',gamma),pngChunk('pHYs',density));
  const {optimize,calls}=smallPngHarness();
  const result=await optimize(new File([original],'color.png',{type:'image/png'}),'logo');
  assert.deepEqual(Buffer.from(await result.file.arrayBuffer()),original);assert.equal(calls.encode.length,0);
});
test('eXIf·APNG·미확인 PNG 청크는 기존 재인코딩 경로를 유지한다',async()=>{
  for(const kind of ['eXIf','acTL','fcTL','fdAT','vpAg']) {
    const {optimize,calls}=smallPngHarness();
    const original=annotatedPng(pngChunk(kind,Buffer.from('synthetic-private-metadata')));
    const result=await optimize(new File([original],'special.png',{type:'image/png'}),'logo');
    assert.equal(calls.encode.length,1,kind);assert.equal((await result.file.text()).includes('synthetic-private-metadata'),false);
  }
});
test('크기가 작은 PNG도 실제 해독 실패를 우회하지 않는다',async()=>{
  const {optimize,calls}=smallPngHarness({decode:async()=>{throw new Error('실제 픽셀 해독 실패');}});
  await assert.rejects(optimize(new File([smallRgbaPng],'small.png',{type:'image/png'}),'logo'),/해독 실패/);
  assert.equal(calls.encode.length,0);
});
test('메타데이터 때문에 5MB를 넘은 작은 PNG도 제거 후 출력 제한을 확인한다',async()=>{
  const original=annotatedPng(pngChunk('tEXt',Buffer.concat([Buffer.from('Comment\0'),Buffer.alloc(IMAGE_OUTPUT_MAX_BYTES,120)])));
  const {optimize,calls}=smallPngHarness();
  const result=await optimize(new File([original],'text-heavy.png',{type:'image/png'}),'logo');
  assert.ok(original.length>IMAGE_OUTPUT_MAX_BYTES);assert.equal(result.bytes,smallRgbaPng.length);assert.equal(calls.encode.length,0);
});
test('헤더와 브라우저 해독 치수가 다르면 원본 압축 픽셀을 재사용하지 않는다',async()=>{
  const {optimize,calls}=smallPngHarness({decode:async()=>({width:2,height:3})});
  const result=await optimize(new File([smallRgbaPng],'oriented.png',{type:'image/png'}),'logo');
  assert.equal(calls.encode.length,1);assert.deepEqual([result.width,result.height],[2,3]);
});
test('JPEG와 WebP는 작아도 회전·개인정보 메타데이터 정리를 위한 기존 재인코딩을 유지한다',async()=>{
  for(const type of ['image/jpeg','image/webp']) {
    const {optimize,calls}=harness({width:30,height:20});
    const result=await optimize(new File(['synthetic-private-EXIF'],'private',{type}),'logo');
    assert.equal(calls.decode,1);assert.equal(calls.encode.length,1);assert.equal((await result.file.text()).includes('synthetic-private-EXIF'),false);
  }
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes,no) => { resolve=yes; reject=no; });
  return { promise,resolve,reject };
}
const nextTurn = () => new Promise(resolve => setImmediate(resolve));

test('다른 파일과 용도를 동시에 선택해도 디코드·인코딩은 FIFO로 한 개씩 실행한다',async()=>{
  let active=0,peak=0;
  const events=[];
  const optimize=createImageOptimizer({
    inspect:()=>({width:8000,height:4000}),
    decode:async source=>{
      active++;peak=Math.max(peak,active);events.push(`decode:${source.name}`);
      await nextTurn();
      return {width:8000,height:4000,name:source.name,close:()=>{active--;events.push(`close:${source.name}`);}};
    },
    encode:async(image,w,h,type)=>{events.push(`encode:${image.name}`);await nextTurn();return new Blob(['pixels'],{type});},
  });
  const results=await Promise.all(['banner','logo','facility','poster','banner','banner','banner','banner'].map((purpose,index)=>
    optimize(new File(['pixels'],`${index}.jpg`,{type:'image/jpeg'}),purpose)));
  assert.equal(results.length,8);assert.equal(peak,1);assert.equal(active,0);
  assert.deepEqual(events,Array.from({length:8},(_,i)=>[`decode:${i}.jpg`,`encode:${i}.jpg`,`close:${i}.jpg`]).flat());
});

test('다음 원본 읽기는 이전 원본의 읽기·디코드·인코딩·해제가 모두 끝난 뒤 시작한다',async()=>{
  const read=deferred(),decode=deferred(),encode=deferred(),events=[];
  const first={type:'image/jpeg',name:'first.jpg',size:1,arrayBuffer:()=>{events.push('first:read');return read.promise;}};
  const second={...first,name:'second.jpg',arrayBuffer:async()=>{events.push('second:read');return new ArrayBuffer(1);}};
  const optimize=createImageOptimizer({
    inspect:()=>({width:30,height:20}),
    decode:async source=>{events.push(`${source.name}:decode`);if(source===first)await decode.promise;return {width:30,height:20,name:source.name,close:()=>events.push(`${source.name}:close`)};},
    encode:async(image,w,h,type)=>{events.push(`${image.name}:encode`);if(image.name===first.name)await encode.promise;return new Blob(['pixels'],{type});},
  });
  const a=optimize(first),b=optimize(second);
  try {
    await nextTurn();assert.deepEqual(events,['first:read']);
    read.resolve(new ArrayBuffer(1));await nextTurn();assert.deepEqual(events,['first:read','first.jpg:decode']);
    decode.resolve();await nextTurn();assert.deepEqual(events,['first:read','first.jpg:decode','first.jpg:encode']);
    encode.resolve();await Promise.all([a,b]);
    assert.deepEqual(events.slice(3,5),['first.jpg:close','second:read']);
  } finally {read.resolve(new ArrayBuffer(1));decode.resolve();encode.resolve();await Promise.allSettled([a,b]);}
});

for(const failureStage of ['read','inspect','decode','encode']) {
  test(`${failureStage} 단계 실패 후에도 큐를 해제하고 다음 파일을 처리한다`,async()=>{
    let closeCount=0,attempts=0;
    const first={type:'image/jpeg',name:'fail.jpg',size:1,arrayBuffer:async()=>{if(failureStage==='read')throw new Error('read 실패');return Uint8Array.of(1).buffer;}};
    const second={...first,name:'next.jpg',arrayBuffer:async()=>Uint8Array.of(2).buffer};
    const optimize=createImageOptimizer({
      inspect:bytes=>failureStage==='inspect'&&bytes[0]===1?null:{width:30,height:20},
      decode:async source=>{
        attempts++;if(source===first&&failureStage==='decode')throw new Error('decode 실패');
        return {width:30,height:20,name:source.name,close:()=>closeCount++};
      },
      encode:async(image,w,h,type)=>{if(image.name===first.name&&failureStage==='encode')throw new Error('encode 실패');return new Blob(['pixels'],{type});},
    });
    const [failed,next]=await Promise.allSettled([optimize(first),optimize(second)]);
    assert.equal(failed.status,'rejected');assert.equal(next.status,'fulfilled');assert.equal(next.value.width,30);
    assert.equal(attempts,['read','inspect'].includes(failureStage)?1:2);
    assert.equal(closeCount,failureStage==='encode'?2:1);
  });
}

test('큐 대기 중인 동일 원본 소비자들은 같은 작업을 공유하고 한 소비자를 기다리지 않아도 처리된다',async()=>{
  const gate=deferred();let decodes=0;
  const blocker=file('image/jpeg'),shared=file('image/jpeg');
  const {optimize}=harness({decode:async source=>{decodes++;if(source===blocker)await gate.promise;return {width:30,height:20};}});
  const pending=optimize(blocker),unobserved=optimize(shared,'banner'),consumer=optimize(shared,'banner');
  assert.equal(unobserved,consumer);
  await nextTurn();assert.equal(decodes,1);
  gate.resolve();await pending;
  assert.equal((await consumer).width,30);assert.equal(decodes,2);
  assert.equal(await optimize(shared,'banner'),await consumer);assert.equal(decodes,2);
});

test('이미 준비된 출력 파일의 캐시는 관련 없는 대용량 작업이 진행 중이어도 바로 재사용한다',async()=>{
  const gate=deferred(),blocker=file('image/jpeg');let decodes=0;
  const {optimize}=harness({decode:async source=>{decodes++;if(source===blocker)await gate.promise;return {width:30,height:20};}});
  const ready=await optimize(file('image/jpeg'),'logo');
  const pending=optimize(blocker);let cached;
  const consumer=optimize(ready.file,'logo').then(value=>{cached=value;});
  try {await nextTurn();assert.equal(cached,ready);assert.equal(decodes,2);}
  finally {gate.resolve();await Promise.all([pending,consumer]);}
});

test('지원하지 않는 형식과 과도한 용량은 다른 이미지 처리를 기다리지 않고 즉시 거부한다',async()=>{
  const gate=deferred();let rejected=0;
  const {optimize}=harness({decode:async()=>{await gate.promise;return {width:30,height:20};}});
  const pending=optimize(file('image/jpeg'));
  const source={type:'image/jpeg',name:'big.jpg',size:IMAGE_SOURCE_MAX_BYTES+1,arrayBuffer:async()=>new ArrayBuffer(1)};
  const invalid=[file('image/gif'),source].map(value=>optimize(value).then(()=>assert.fail('유효하지 않은 파일을 허용함'),()=>rejected++));
  try {await nextTurn();assert.equal(rejected,2);}
  finally {gate.resolve();await Promise.all([pending,...invalid]);}
});
