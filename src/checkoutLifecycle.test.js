import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isConfirmedPayment} from './paymentApi.js';

const source=readFileSync(new URL('./main.jsx',import.meta.url),'utf8').replaceAll('\r\n','\n');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(name,overrides={}){
 const scope=source.slice(source.indexOf(`function ${name}(`));
 const body=scope.match(/const submit = async \(event\) => \{([\s\S]*?)\n  \};\n  if \(recoveryOrder/)[1];
 const remembered=[],done=[],recovery=[],errors=[],posts=[];
 const deps={checkoutMounted:{current:true},submitLock:{current:false},imagePreparation:{current:{pending:0}},
  setSubmitError:x=>errors.push(x),setSubmitting:()=>{},isActiveHospitalMember:()=>true,auth:{},facilityType:'병원',
  setFacilityError:()=>{},FormData:class{delete(){}entries(){return[['terms','agreed'],['manager','검수'],['phone','000'],['email','qa@example.invalid']];}},
  isMainAdPlan:false,brandFile:null,brandTemplate:'',facilityPhotos:[],posterImages:[],
  uploadJobImage:async()=>'',plan:{id:'basic',name:'검수상품',price:59000},method:'card',
  inicisPaymentChannel:()=> 'pc',PRIVACY_FORM_VERSION:'test',contactPreview:{contactVisibility:'private'},
  lockedCustomer:{name:'검수',email:'qa@example.invalid',phone:'000'},talentId:'',setPreviewRetry:()=>{},
  postPayment:async(path)=>{posts.push(path);return{response:{ok:true},result:{order:{orderNumber:'SYNTHETIC'},inicis:{configured:true}}};},
  rememberOrder:x=>remembered.push(x),openInicisPayment:async()=>{},isConfirmedPayment,
  invalidateSiteOperations:()=>{},appendStoredRecord:()=>{},setDone:x=>done.push(x),
  setRecoveryOrder:x=>recovery.push(x),setPaidInfo:()=>{},trackConversion:()=>{},...overrides};
 const run=new AsyncFunction(...Object.keys(deps),'event',body).bind(null,...Object.values(deps));
 const event={preventDefault(){},currentTarget:{querySelector(){return null;}}};
 return{run:()=>run(event),deps,remembered,done,recovery,errors,posts};
}

test('공고 이미지 업로드 중 화면을 닫으면 늦은 주문을 만들지 않는다',async()=>{
 const upload=deferred();let orders=0;
 const h=setup('Checkout',{isMainAdPlan:true,brandFile:{name:'synthetic.png'},uploadJobImage:()=>upload.promise,
  postPayment:async()=>{orders++;}});
 const pending=h.run();h.deps.checkoutMounted.current=false;upload.resolve('/api/uploads/synthetic.png');await pending;
 assert.equal(orders,0);assert.deepEqual(h.remembered,[]);assert.deepEqual(h.done,[]);
});

for(const name of ['Checkout','TalentUnlockCheckout']){
 test(`${name}: 주문 응답 전에 화면을 닫아도 저장된 주문번호는 보존하고 PG는 열지 않는다`,async()=>{
  const response=deferred();let opened=0;
  const h=setup(name,{postPayment:()=>response.promise,openInicisPayment:async()=>opened++});
  const pending=h.run();await tick();h.deps.checkoutMounted.current=false;
  response.resolve({response:{ok:true},result:{order:{orderNumber:'SYNTHETIC'},inicis:{configured:true}}});await pending;
  assert.deepEqual(h.remembered,[{orderNumber:'SYNTHETIC'}]);assert.equal(opened,0);assert.equal(h.done.length,0);
 });
 test(`${name}: 승인 응답 전에 화면을 닫으면 확인된 주문 복구만 정리하고 완료 화면은 갱신하지 않는다`,async()=>{
  const approval=deferred();let calls=0;
  const h=setup(name,{postPayment:async()=>++calls===1?{response:{ok:true},result:{order:{orderNumber:'SYNTHETIC'}}}:approval.promise});
  const pending=h.run();await tick();assert.equal(calls,2);h.deps.checkoutMounted.current=false;
  approval.resolve({response:{ok:true},result:{approved:true,status:'paid',orderNumber:'SYNTHETIC'}});await pending;
  assert.deepEqual(h.remembered,[{orderNumber:'SYNTHETIC'},null]);assert.equal(h.done.length,0);assert.equal(h.recovery.length,0);
 });
 test(`${name}: SDK 로딩 중 화면 종료 여부를 결제 모듈에 전달하고 늦은 닫힘 이벤트를 무시한다`,async()=>{
  const sdk=deferred();let options;
  const h=setup(name,{openInicisPayment:async(_params,_order,gates)=>{options=gates;return sdk.promise;}});
  const pending=h.run();await tick();assert.equal(options.shouldOpen(),true);
  h.deps.checkoutMounted.current=false;assert.equal(options.shouldOpen(),false);options.onClose();
  assert.deepEqual(h.recovery,[]);sdk.reject(Object.assign(Error('화면 종료'),{code:'PAYMENT_VIEW_CLOSED'}));await pending;
  assert.deepEqual(h.done,[]);assert.deepEqual(h.recovery,[]);
 });
 for(const [label,result] of [
  ['문자열 승인',{approved:'false',status:'paid',orderNumber:'SYNTHETIC'}],
  ['다른 주문',{approved:true,status:'paid',orderNumber:'OTHER'}],
  ['미결제 상태',{approved:true,status:'pending_review',orderNumber:'SYNTHETIC'}],
 ]) test(`${name}: ${label}은 화면에서도 완료되지 않는다`,async()=>{
  let calls=0;const order={orderNumber:'SYNTHETIC'};
  const h=setup(name,{postPayment:async()=>++calls===1?{response:{ok:true},result:{order}}:{response:{ok:true},result}});
  await h.run();assert.deepEqual(h.done,[]);assert.deepEqual(h.recovery,[order]);assert.notEqual(h.remembered.at(-1),null);
 });
 test(`${name}: 대기 중 반복 클릭은 새 주문을 추가하지 않는다`,async()=>{
  const response=deferred();let calls=0;
  const h=setup(name,{postPayment:()=>{calls++;return response.promise;}});
  const pending=h.run();await h.run();await tick();assert.equal(calls,1);
  response.resolve({response:{ok:false},result:{error:'검수 종료'}});await pending;assert.equal(h.deps.submitLock.current,false);
 });
}
