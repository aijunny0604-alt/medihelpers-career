import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMemberPaymentDetails, requestAccountRecovery, requestMemberRefund } from './accountWorkflowApi.js';

const orderNumber = 'SYNTHETIC-ORDER';
const refund = {requested:true, refundId:'synthetic-refund-1', orderNumber};

test('환불 접수는 서버 접수 플래그·식별자·동일 주문번호를 확인한다', async () => {
  const result = await requestMemberRefund(orderNumber, '합성 검수 사유', {fetchImpl:async (path, init) => {
    assert.equal(path, '/api/member-center');
    assert.equal(init.credentials, 'same-origin');
    assert.deepEqual(JSON.parse(init.body), {action:'refund_request',orderNumber,reason:'합성 검수 사유'});
    return Response.json(refund);
  }});
  assert.deepEqual(result, refund);
});

for (const [name,payload] of [
  ['빈 응답', {}], ['명시적인 실패', {...refund,requested:false}], ['문자열 성공', {...refund,requested:'true'}],
  ['다른 주문', {...refund,orderNumber:'OTHER-ORDER'}], ['접수번호 누락', {...refund,refundId:undefined}],
  ['빈 접수번호', {...refund,refundId:''}], ['유효하지 않은 접수번호', {...refund,refundId:' <html> '}],
  ['배열', []], ['null', null],
]) test(`환불 ${name} 응답을 접수 완료로 표시하지 않는다`, async () => {
  await assert.rejects(requestMemberRefund(orderNumber, '합성 사유', {fetchImpl:async () => Response.json(payload)}), {code:'SUBMISSION_RESULT_UNKNOWN'});
});

test('환불 HTML·네트워크 실패는 재접수 전 내역 확인을 안내한다', async () => {
  for (const fetchImpl of [async () => new Response('<html>gateway</html>'), async () => {throw Error('offline');}]) {
    await assert.rejects(requestMemberRefund(orderNumber, '합성 사유', {fetchImpl}), /중복 요청 전에 결제 내역/);
  }
});

test('서버의 명확한 환불 거절 사유를 유지한다', async () => {
  await assert.rejects(requestMemberRefund(orderNumber, '합성 사유', {fetchImpl:async () => Response.json({error:'이미 접수된 요청입니다.'}, {status:409})}), /이미 접수된/);
});

for (const action of ['id', 'password', 'reset_password']) test(`${action} 복구는 엄격한 성공 응답만 허용한다`, async () => {
  const body = action === 'reset_password' ? {action} : {requestType:action};
  const flag = action === 'reset_password' ? 'reset' : 'accepted';
  for (const value of [undefined,false,'true','false']) {
    await assert.rejects(requestAccountRecovery(body, {fetchImpl:async () => Response.json({[flag]:value})}), {code:'SUBMISSION_RESULT_UNKNOWN'});
  }
  assert.equal((await requestAccountRecovery(body, {fetchImpl:async () => Response.json({[flag]:true})}))[flag], true);
});

for (const bodyStalls of [false,true]) test(`복구·환불 ${bodyStalls ? '본문' : '응답'} 무응답은 자동 재전송 없이 제한한다`, async () => {
  for (const call of [options=>requestAccountRecovery({requestType:'id'},options), options=>requestAccountRecovery({action:'reset_password'},options), options=>requestMemberRefund(orderNumber,'합성 사유',options)]) {
    let calls=0, signal;
    await assert.rejects(call({timeoutMs:5,fetchImpl:async (_,init)=>{
      calls++; signal=init.signal;
      return bodyStalls ? {ok:true,json:()=>new Promise(()=>{})} : new Promise(()=>{});
    }}), {code:'SUBMISSION_RESULT_UNKNOWN'});
    assert.equal(calls,1);
    assert.equal(signal.aborted,true);
  }
});

test('시간 초과 뒤 늦게 도착한 성공 응답은 요청 결과를 다시 바꾸지 않는다', async () => {
  let resolveResponse, success=0;
  const pending=requestMemberRefund(orderNumber,'합성 사유',{timeoutMs:5,fetchImpl:()=>new Promise(resolve=>{resolveResponse=resolve;})}).then(()=>{success++;});
  await assert.rejects(pending,{code:'SUBMISSION_RESULT_UNKNOWN'});
  resolveResponse(Response.json(refund));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(success,0);
});

test('결제 내역 새로고침은 읽기 요청이며 확인된 배열만 반환한다', async () => {
  const data={signedIn:true,orders:[],refunds:[]};
  assert.deepEqual(await loadMemberPaymentDetails({fetchImpl:async(path,init)=>{
    assert.equal(path,'/api/member-center');assert.equal(init.method,'GET');assert.equal(init.body,undefined);
    return Response.json(data);
  }}),data);
  for(const invalid of [{},{signedIn:false,orders:[],refunds:[]},{signedIn:true,orders:null,refunds:[]}]) {
    await assert.rejects(loadMemberPaymentDetails({fetchImpl:async()=>Response.json(invalid)}),/기존 내역은 유지/);
  }
});

test('환불 후 결제 내역 조회의 헤더·본문 무응답도 유한 시간에 종료한다', async () => {
  for(const bodyStalls of [false,true]) {
    let signal;
    await assert.rejects(loadMemberPaymentDetails({timeoutMs:5,fetchImpl:async(_,init)=>{
      signal=init.signal;return bodyStalls?{ok:true,json:()=>new Promise(()=>{})}:new Promise(()=>{});
    }}),/최신 결제 내역을 확인하지 못했습니다/);
    assert.equal(signal.aborted,true);
  }
});
