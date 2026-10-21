import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectUploadImage} from './uploadImageValidation.js';

// Small real encoder outputs, not signature-only stand-ins.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/upload-images.json',import.meta.url),'utf8'));
for (const [format,base64] of Object.entries(fixture)) {
  const bytes = new Uint8Array(Buffer.from(base64,'base64'));
  test(`${format}: 실제 인코딩 이미지의 크기 확인`, () => {
    assert.deepEqual(inspectUploadImage(bytes,`image/${format}`),{width:3,height:2});
  });
  test(`${format}: 잘린 파일은 저장하지 않는다`, () => {
    for (let length = 0; length < bytes.length; length++) {
      assert.equal(inspectUploadImage(bytes.slice(0,length),`image/${format}`),null,`length=${length}`);
    }
  });
  test(`${format}: 파일 내용과 다른 MIME 차단`, () => {
    for (const other of Object.keys(fixture).filter(x=>x!==format)) {
      assert.equal(inspectUploadImage(bytes,`image/${other}`),null);
    }
  });
}
test('PNG 청크 길이 위조 및 과대한 해상도 차단', () => {
  for (const [offset,value] of [[8,0xffffffff],[16,0],[16,24001],[20,24001],[16,20000]]) {
    const bytes=new Uint8Array(Buffer.from(fixture.png,'base64'));
    new DataView(bytes.buffer).setUint32(offset,value);
    if (value===20000) new DataView(bytes.buffer).setUint32(20,20000);
    assert.equal(inspectUploadImage(bytes,'image/png'),null);
  }
});
test('WEBP RIFF 길이 위조와 압축 데이터 없는 컨테이너 차단', () => {
  const bytes=new Uint8Array(Buffer.from(fixture.webp,'base64'));
  bytes[4]++;
  assert.equal(inspectUploadImage(bytes,'image/webp'),null);
  const empty=new Uint8Array([82,73,70,70,4,0,0,0,87,69,66,80]);
  assert.equal(inspectUploadImage(empty,'image/webp'),null);
});
test('확장자만 이미지인 HTML과 서명뿐인 파일 차단', () => {
  assert.equal(inspectUploadImage(new TextEncoder().encode('<html>image.png</html>'),'image/png'),null);
  assert.equal(inspectUploadImage(new Uint8Array([255,216,255]),'image/jpeg'),null);
});
