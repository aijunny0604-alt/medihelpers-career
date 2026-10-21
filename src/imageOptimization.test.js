import test from 'node:test';
import assert from 'node:assert/strict';
import { createImageOptimizer, imageOutputSize, IMAGE_SOURCE_MAX_BYTES, IMAGE_OUTPUT_MAX_BYTES } from './imageOptimization.js';

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
