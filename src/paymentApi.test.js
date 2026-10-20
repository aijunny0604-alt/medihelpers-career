import test from 'node:test';
import assert from 'node:assert/strict';
import { postPayment } from './paymentApi.js';

test('결제 생성 요청과 서버의 주문번호·서명·금액을 변경하지 않는다', async () => {
  const body={productId:'basic',checkoutAcknowledged:true};
  const data={order:{orderNumber:'LOCAL-ONLY',totalAmount:29000},inicis:{signature:'synthetic'}};
  const {response,result}=await postPayment('/api/payment-orders',body,{fetchImpl:async(path,init)=>{
    assert.equal(path,'/api/payment-orders');
    assert.equal(init.method,'POST');assert.equal(init.credentials,'same-origin');
    assert.deepEqual(JSON.parse(init.body),body);
    return Response.json(data,{status:201});
  }});
  assert.equal(response.status,201);assert.deepEqual(result,data);
});

test('결제 헤더 대기와 본문 대기를 모두 제한하고 자동 재시도하지 않는다', async () => {
  for (const bodyStalls of [false,true]) {
    let calls=0,signal;
    await assert.rejects(postPayment('/api/payment-orders',{},{
      timeoutMs:5,fetchImpl:async(_,options)=>{
        calls++;signal=options.signal;
        return bodyStalls ? {ok:true,json:()=>new Promise(()=>{})} : new Promise(()=>{});
      },
    }),error=>error.code==='PAYMENT_RESULT_UNKNOWN' && /응답이 지연/.test(error.message));
    assert.equal(calls,1);assert.equal(signal.aborted,true);
  }
});

test('연결 중단·잘못된 본문·주문번호 없는 성공 응답을 실패 확정으로 오인하지 않는다', async () => {
  for (const fetchImpl of [
    async()=>{throw Error('offline');},
    async()=>new Response('<html>gateway error</html>',{status:502}),
    async()=>Response.json(null),
    async()=>Response.json([]),
    async()=>Response.json({}),
  ]) await assert.rejects(postPayment('/api/payment-orders',{}, {fetchImpl}),{code:'PAYMENT_RESULT_UNKNOWN'});
});

test('명확한 서버 거절은 기존 오류 코드와 내용을 보존한다', async () => {
  const data={error:'공개 범위가 변경되었습니다.',code:'CONTACT_VISIBILITY_CHANGED'};
  const {response,result}=await postPayment('/api/payment-orders',{}, {fetchImpl:async()=>Response.json(data,{status:409})});
  assert.equal(response.ok,false);assert.deepEqual(result,data);
});

test('같은 주문 결과 확인에 주문번호만 보내고 승인 여부는 서버 값을 따른다', async () => {
  const {result}=await postPayment('/api/payment-approve',{orderNumber:'LOCAL-ONLY'},{
    fetchImpl:async(_,init)=>{
      assert.deepEqual(JSON.parse(init.body),{orderNumber:'LOCAL-ONLY'});
      return Response.json({approved:false,status:'pending'});
    },
  });
  assert.equal(result.approved,false);
});

test('기존 주문 재개도 같은 번호를 보존하고 지연은 불확실 상태로 반환한다', async () => {
  const body={resumeOrderNumber:'LOCAL-ONLY',checkoutAcknowledged:true};
  let resolveResponse,calls=0;
  await assert.rejects(postPayment('/api/payment-orders',body,{timeoutMs:5,fetchImpl:(_,init)=>{
    calls++;assert.equal(JSON.parse(init.body).resumeOrderNumber,'LOCAL-ONLY');
    return new Promise(resolve=>{resolveResponse=resolve;});
  }}),{code:'PAYMENT_RESULT_UNKNOWN'});
  resolveResponse(Response.json({order:{orderNumber:'LOCAL-ONLY'}}));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls,1);
});

test('지정된 결제 API 외에는 요청을 보내지 않는다', async () => {
  let calls=0;
  await assert.rejects(postPayment('https://other.invalid',{}, {fetchImpl:async()=>{calls++;}}),/잘못된/);
  assert.equal(calls,0);
});
