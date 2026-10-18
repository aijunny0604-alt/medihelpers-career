import { koreanInputToIso } from './koreanTime.js';
import React, { useState } from 'react';
import { confirmAction } from './confirmAction.js';
import { withBase } from './basePath.js';
function ManualRefundRecord({refund,payment,capture}) {
 const remaining=Math.max(0,Number(payment?.totalAmount||0)-Number(payment?.refundedAmount||0));
 const [evidence,setEvidence]=useState({tid:capture?.providerTransactionId||'',cancellationTid:'',amount:'',remainingAmount:'',canceledAt:'',reference:'',customerMessage:'',confirmed:false});
 const [rejectReason,setRejectReason]=useState('');
 const [rejectOpen,setRejectOpen]=useState(false);
 const [busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[message,setMessage]=useState('');
 const field=(name,value)=>setEvidence(current=>({...current,[name]:value}));
 async function reject() {
  if(rejectReason.trim().length<5){setMessage('회원에게 안내할 반려 사유를 5자 이상 입력해주세요.');return;}
  if(!await confirmAction('이 환불 요청을 반려합니다. 이미 이니시스에서 취소한 거래는 반려하지 마세요.',{title:'환불 요청 반려',confirmLabel:'반려'}))return;
  setBusy(true);
  try {
   const response=await fetch(withBase('/api/admin-refund-review'),{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({refundId:refund.id,decision:'reject',reason:rejectReason.trim()})});
   const result=await response.json();if(!response.ok)throw Error(result.error);
   setSaved(true);setMessage('반려 사유를 저장하고 회원의 결제 내역과 홈페이지 알림에 안내했습니다.');
  }catch(error){setMessage(error.message);}finally{setBusy(false);}
 }
 async function submit(event) {
  event.preventDefault();
  const canceledAt=new FormData(event.currentTarget).get('canceledAt');
  let canceledAtIso;
  try { canceledAtIso=koreanInputToIso(canceledAt); } catch {setMessage('올바른 한국 시각으로 취소 완료 시각을 입력해주세요.');return;}
  if(Number(evidence.amount)+Number(evidence.remainingAmount)!==remaining){setMessage('이번 취소 금액과 취소 후 잔액의 합계가 현재 남은 결제 금액과 일치해야 합니다.');return;}
  if(!await confirmAction(`${Number(evidence.amount).toLocaleString()}원의 이니시스 취소 완료를 기록합니다. 이 주문의 남은 광고·열람권은 종료됩니다. 부분 환불은 기존 유료 열람 기록을 유지하며, 전액 환불은 모든 열람 권한을 회수합니다. 회원에게 입력한 처리 안내가 공개됩니다. 여기서는 카드 취소를 요청하지 않습니다.`,{title:'취소 완료 기록 반영',confirmLabel:'확인 후 반영'}))return;
  setBusy(true);setMessage('');
  try {
   const response=await fetch(withBase('/api/admin-refund-review'),{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({refundId:refund.id,decision:'record_external',evidence:{...evidence,amount:Number(evidence.amount),remainingAmount:Number(evidence.remainingAmount),canceledAt:canceledAtIso}})});
   const result=await response.json();if(!response.ok)throw Error(result.error);
   setSaved(true);setMessage('환불 원장·이용 권한·회원 안내를 함께 저장했습니다. 목록을 새로고침해 확인해주세요.');
  }catch(error){setMessage(error.message);}finally{setBusy(false);}
 }
 if(refund.status==='processing')return <p role="status">기존 자동 취소가 처리 중입니다. 거래 대사를 완료한 뒤 처리해주세요.</p>;
 return <form className="manual-refund-form" onSubmit={submit}>
  <p>이니시스 관리자에서 <strong>전액 또는 부분 취소 완료</strong>를 확인한 뒤 입력해주세요. 취소 실패·대기 상태를 반영하면 안 됩니다.</p>
  <p>원 결제 {Number(payment?.totalAmount||0).toLocaleString()}원 · 누적 환불 {Number(payment?.refundedAmount||0).toLocaleString()}원 · <strong>남은 결제 {remaining.toLocaleString()}원</strong></p>
  {Number(payment?.totalCredits)>0&&<p>열람권: 총 {payment.totalCredits}건 중 사용 {payment.usedCredits}건. 부분 환불 시 남은 열람권은 종료하고 기존 유료 열람은 유지합니다.</p>}
  <p>광고는 해당 주문의 남은 노출이 종료됩니다. 다른 유효 결제의 노출은 유지합니다. 환불 금액은 이용 내역·계약 조건을 검토한 뒤 산정해주세요.</p>
  <a href="https://iniweb.inicis.com/" target="_blank" rel="noopener noreferrer">이니시스 관리자 열기</a>
  <fieldset disabled={busy||saved}>
   <button type="button" className="button outline" aria-expanded={rejectOpen} onClick={()=>{setRejectOpen(!rejectOpen);setMessage('');}}>{rejectOpen?'취소 완료 기록으로 돌아가기':'환불 요청 반려'}</button>
   {rejectOpen?<>
    <label>회원에게 안내할 반려 사유<textarea rows={4} minLength={5} maxLength={1000} value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="이용 내역과 반려 근거, 추가 확인 또는 문의 방법을 구체적으로 적어주세요." /></label>
    <p>이 사유는 회원의 결제 내역과 홈페이지 알림에 표시됩니다. 이미 PG에서 취소한 거래는 반려하지 마세요.</p>
    <button type="button" className="button danger" onClick={reject}>사유 안내 후 반려</button>
   </>:<>
   <label>원 거래번호(TID)<input required maxLength={100} value={evidence.tid} onChange={e=>field('tid',e.target.value.trim())} /></label>
   <label>취소 거래번호(TID)<input required minLength={4} maxLength={100} value={evidence.cancellationTid} onChange={e=>field('cancellationTid',e.target.value.trim())} /></label>
   <small>부분 취소는 이니시스의 별도 부분취소 거래번호를 입력합니다. 최초 전액 취소는 원 거래번호로 확인할 수 있습니다.</small>
   <label>이번 취소 금액(원)<input required type="number" min="1" max={remaining} step="1" value={evidence.amount} onChange={e=>field('amount',e.target.value)} /></label>
   <label>이니시스 취소 후 남은 결제 금액(원)<input required type="number" min="0" max={remaining} step="1" value={evidence.remainingAmount} onChange={e=>field('remainingAmount',e.target.value)} /></label>
   <label>취소 완료 시각(한국 시각 KST)<input required type="datetime-local" step="1" name="canceledAt" /></label>
   <label>내부 확인 근거<input required minLength={5} maxLength={200} placeholder="이니시스 취소 완료 내역 확인 근거 (카드번호·비밀키 입력 금지)" value={evidence.reference} onChange={e=>field('reference',e.target.value)} /></label>
   <label>회원에게 안내할 처리 결과·금액 산정 근거<textarea required minLength={5} maxLength={1000} rows={4} value={evidence.customerMessage} onChange={e=>field('customerMessage',e.target.value)} placeholder="예: 총 10건 중 사용한 2건의 이용료를 제외하고 미사용 8건의 금액을 환불했습니다. 남은 열람권은 종료되며 기존 열람 기록은 유지됩니다." /></label>
   <label className="manual-refund-confirm"><input required type="checkbox" checked={evidence.confirmed} onChange={e=>field('confirmed',e.target.checked)} />원 주문·취소 거래번호·금액·잔액을 대조했고 이니시스에서 취소 완료를 확인했습니다.</label>
   <button className="button danger" type="submit">취소 완료 기록 반영</button>
   </>}
  </fieldset>
  {message&&<p role="status">{message}</p>}
  {saved&&<button type="button" className="button outline" onClick={()=>window.location.reload()}>목록 새로고침</button>}
 </form>;
}
export default function RefundReview({ refund, payment, capture, virtual = true, manual = false }) {
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[reason,setReason]=useState('');
 async function inquire(){
  setBusy(true);setMessage('');
  try {
   const response=await fetch(withBase('/api/admin-payment-inquiry'),{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({orderId:refund.orderId})});
   const result=await response.json();if(!response.ok)throw Error(result.error);
   const labels={APPROVAL:'승인',CANCEL:'전액 취소',PART_CANCEL:'부분 취소'};
   setMessage('이니시스: '+labels[result.inquiry.providerStatus]+' · '+Number(result.inquiry.amount).toLocaleString()+'원. '+(result.inquiry.matched?'주문 상태와 일치합니다.':'주문 상태와 대사가 필요합니다.')+' 조회만 수행했으며 결제·환불·이용 권한은 변경하지 않았습니다.');
  }catch(error){setMessage(error.message);}finally{setBusy(false);}
 }
 async function review(decision){
  if(decision==='reject'&&reason.trim().length<5){setMessage('회원에게 안내할 반려 사유를 5자 이상 입력해주세요.');return;}
  const label=refund.status==='processing'?'처리 결과 확인':virtual?'가상 결제 전액 취소':'카드 결제 전액 취소';
  const explanation=refund.status==='processing'?'기존 취소 결과를 확인하고 미완료된 권한 회수를 이어서 처리합니다. 확인되지 않은 PG 취소를 자동 재요청하지 않습니다.':virtual?'가상 결제 전액을 취소하고 이 주문의 열람권과 공고 노출을 회수합니다. 실제 금전은 이동하지 않습니다.':'이니시스 카드 결제 전액을 취소합니다. 취소가 확인되면 이 주문의 열람권과 공고 노출을 회수합니다.';
  if(!await confirmAction(decision==='approve'?explanation:'이 환불 요청을 반려합니다.',{title:'환불 요청 처리',confirmLabel:decision==='approve'?label:'요청 반려'}))return;
  setBusy(true);
  try{const response=await fetch(withBase('/api/admin-refund-review'),{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({refundId:refund.id,decision,reason})});const result=await response.json();if(!response.ok)throw Error(result.error);setMessage(decision==='approve'?(result.virtual?'가상 결제 취소 및 권한 회수 완료':'카드 결제 취소 및 권한 회수 완료'):'반려 사유를 저장하고 홈페이지 알림에 안내했습니다.');}catch(error){setMessage(error.message);setBusy(false);}
 }
 if (!virtual && manual) return <ManualRefundRecord refund={refund} payment={payment} capture={capture} />;
 // The real production mode uses the form above; retain local virtual tests.
 return <div className="refund-review-actions"><label>회원에게 안내할 반려 사유<textarea maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} /></label>{!virtual&&<button type="button" className="button outline" disabled={busy} onClick={inquire}>이니시스 거래 조회</button>}<button type="button" className="button danger" disabled={busy} onClick={()=>review('approve')}>{refund.status==='processing'?'처리 결과 확인':virtual?'가상 결제 환불 테스트':'카드 결제 전액 취소'}</button>{refund.status==='requested'&&<button type="button" className="button outline" disabled={busy} onClick={()=>review('reject')}>반려</button>}{message&&<p role="status">{message}</p>}</div>;
}
