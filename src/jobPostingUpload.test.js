import test from 'node:test';
import assert from 'node:assert/strict';
import { createJobImageUploader, isUploadedJobImageUrl } from './jobPostingUpload.js';

const image = new File(['image'],'test.png',{type:'image/png'});
const url = '/api/uploads/hospitals/account-id/banner/image-id.png';
const response = (body,ok=true) => ({ok,json:async () => body});
function uploader(fetcher,options={}) { return createJobImageUploader({optimize:async () => ({file:image}),fetcher,allowDataUrl:false,...options}); }

test('준비된 파일과 인증 쿠키를 전송하고 명시적인 저장 완료만 성공으로 처리한다', async () => {
  let call;
  const upload = uploader(async (...args) => {call=args; return response({uploaded:true,url});});
  assert.equal(await upload(image,'banner'),url);
  assert.equal(call[0],'/api/uploads'); assert.equal(call[1].body,image);
  assert.equal(call[1].headers['x-upload-purpose'],'banner'); assert.equal(call[1].credentials,'same-origin');
});
test('파일이 없으면 선택 이미지 업로드를 생략한다', async () => {
  assert.equal(await uploader(() => { throw new Error('호출 금지'); })(null,'banner'),'');
});
test('최적화 실패 후에는 서버에 전송하지 않는다', async () => {
  let sent = false;
  const upload = uploader(async () => {sent=true;}, {optimize:async () => {throw new Error('손상된 이미지');}});
  await assert.rejects(upload(image,'banner'),/손상/); assert.equal(sent,false);
});
test('성공 HTTP에도 uploaded 누락·false·문자열·URL 누락은 성공으로 오인하지 않는다', async () => {
  for (const body of [{url},{uploaded:false,url},{uploaded:'true',url},{uploaded:'false',url},{uploaded:true},null,[]]) {
    await assert.rejects(uploader(async () => response(body))(image,'banner'));
  }
});
test('실패 HTTP의 uploaded true도 실패한다', async () => {
  await assert.rejects(uploader(async () => response({uploaded:true,url,error:'저장 실패'},false))(image,'banner'),/저장 실패/);
});
test('외부·상대탈출·보호 프로필·스크립트·HTML 주소는 이미지 저장 URL로 인정하지 않는다', async () => {
  for (const invalid of ['https://evil.example/image.png','//evil.example/image.png','javascript:alert(1)','/api/uploads/profiles/a/photo.png','/api/uploads/hospitals/../image.png','/api/uploads/hospitals/a/banner/i.svg','/api/uploads/hospitals/a/banner/i.png?x=1','/api/uploads/hospitals//banner/i.png','/api/uploads/hospitals/a/other/i.png']) {
    assert.equal(isUploadedJobImageUrl(invalid),false);
    await assert.rejects(uploader(async () => response({uploaded:true,url:invalid}))(image,'banner'));
  }
});
test('data URL은 명시적 개발 모드에서만 허용한다', () => {
  assert.equal(isUploadedJobImageUrl('data:image/png;base64,YQ==',false),false);
  assert.equal(isUploadedJobImageUrl('data:image/png;base64,YQ==',true),true);
  assert.equal(isUploadedJobImageUrl('data:text/html;base64,YQ==',true),false);
});
test('비 JSON 응답과 네트워크 실패를 성공으로 오인하지 않는다', async () => {
  await assert.rejects(uploader(async () => ({ok:true,json:async () => {throw new SyntaxError('HTML');}}))(image,'banner'),/결과를 확인하지 못/);
  await assert.rejects(uploader(async () => {throw new TypeError('offline');})(image,'banner'),/결과를 확인하지 못/);
});
test('요청 무응답 시간 초과를 종료하고 자동 재전송하지 않는다', async () => {
  let signal, sent=0;
  const upload = uploader(async (_,options) => {signal=options.signal; sent++; return new Promise(() => {});},{timeoutMs:5});
  await assert.rejects(upload(image,'banner'),/시간이 초과/);
  assert.equal(signal.aborted,true); assert.equal(sent,1);
});
test('헤더 뒤 본문이 멈춰도 시간 초과로 종료한다', async () => {
  await assert.rejects(uploader(async () => ({ok:true,json:() => new Promise(() => {})}),{timeoutMs:5})(image,'banner'),/시간이 초과/);
});
