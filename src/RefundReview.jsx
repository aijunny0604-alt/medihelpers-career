import { koreanInputToIso } from './koreanTime.js';
import React, { useState } from 'react';
import { confirmAction } from './confirmAction.js';
import { withBase } from './basePath.js';
function ManualRefundRecord({refund}) {
 const [evidence,setEvidence]=useState({tid:'',amount:'',canceledAt:'',reference:'',confirmed:false});
 const [busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[message,setMessage]=useState('');
 const field=(name,value)=>setEvidence(current=>({...current,[name]:value}));
 async function reject() {
  if(!await confirmAction('이 환불 요청을 반려합니다. 이미 이니시스에서 취소한 거래는 반려하지 마세요.',{title:'환불 요청 반려',confirmLabel:'반려'}))return;
  setBusy(true);
  try {
   const response=await fetch(withBase('/api/admin-refund-review'),{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({refundId:refund.id,decision:'reject'})});
   const result=await response.json();if(!response.ok)throw Error(result.error);
   setSaved(true);setMessage('환불 요청을 반려했습니다. 목록을 새로고침해주세요.');
  }catch(error){setMessage(error.message);}finally{setBusy(false);}
 }
 async function submit(event) {
  event.preventDefault();
  const canceledAt=new FormData(event.currentTarget).get('canceledAt');
  let canceledAtIso;
  try { canceledAtIso=koreanInputToIso(canceledAt); } catch {setMessage('올바른 한국 시각으로 취소 완료 시각을 입력해주세요.');return;}
  if(!await confirmAction('이니시스 관리자에서 이미 전액 취소된 거래를 홈페이지에 반영합니다. 이 주문의 광고 노출과 열람권이 회수됩니다. 여기서는 카드 취소를 요청하지 않습니다.',{title:'취소 완료 기록 반영',confirmLabel:'확인 후 반영'}))return;
  setBusy(true);setMessage('');
  try {
   const response=await fetch(withBase('/api/admin-refund-review'),{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({refundId:refund.id,decision:'record_external',evidence:{...evidence,amount:Number(evidence.amount),canceledAt:canceledAtIso}})});
   const result=await response.json();if(!response.ok)throw Error(result.error);
   setSaved(true);setMessage('취소 완료 기록과 이용 권한 회수를 저장했습니다. 목록을 새로고침해 확인해주세요.');
  }catch(error){setMessage(error.message);}finally{setBusy(false);}
 }
 if(refund.status==='processing')return <p role="status">기존 자동 취소가 처리 중입니다. 거래 대사를 완료한 뒤 처리해주세요.</p>;
 return <form className="manual-refund-form" onSubmit={submit}>
  <p>이니시스 관리자에서 <strong>전액 취소 완료</strong>를 확인한 뒤 입력해주세요. 부분 취소는 이 화면에서 반영할 수 없습니다.</p>
  <a href="https://iniweb.inicis.com/" target="_blank" rel="noopener noreferrer">이니시스 관리자 열기</a>
  <fieldset disabled={busy||saved}>
   <label>원 거래번호(TID)<input required maxLength={100} value={evidence.tid} onChange={e=>field('tid',e.target.value.trim())} /></label>
   <label>전액 취소 금액(원)<input required type="number" min="1" step="1" value={evidence.amount} onChange={e=>field('amount',e.target.value)} /></label>
   <label>취소 완료 시각(한국 시각 KST)<input required type="datetime-local" step="1" name="canceledAt" /></label>
   <label>확인 근거<input required minLength={5} maxLength={200} placeholder="예: 이니시스 거래내역의 전액 취소 완료 확인" value={evidence.reference} onChange={e=>field('reference',e.target.value)} /></label>
   <label className="manual-refund-confirm"><input required type="checkbox" checked={evidence.confirmed} onChange={e=>field('confirmed',e.target.checked)} />원 주문·거래번호·금액을 대조했고 이니시스에서 전액 취소 완료를 확인했습니다.</label>
   <button className="button danger" type="submit">취소 완료 기록 반영</button>
   <button className="button outline" type="button" onClick={reject}>환불 요청 반려</button>
  </fieldset>
  {message&&<p role="status">{message}</p>}
  {saved&&<button type="button" className="button outline" onClick={()=>window.location.reload()}>목록 새로고침</button>}
 </form>;
}
export default function RefundReview({ refund, virtual = true, manual = false }) {
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
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
  const label=refund.status==='processing'?'처리 결과 확인':virtual?'가상 결제 전액 취소':'카드 결제 전액 취소';
  const explanation=refund.status==='processing'?'기존 취소 결과를 확인하고 미완료된 권한 회수를 이어서 처리합니다. 확인되지 않은 PG 취소를 자동 재요청하지 않습니다.':virtual?'가상 결제 전액을 취소하고 이 주문의 열람권과 공고 노출을 회수합니다. 실제 금전은 이동하지 않습니다.':'이니시스 카드 결제 전액을 취소합니다. 취소가 확인되면 이 주문의 열람권과 공고 노출을 회수합니다.';
  if(!await confirmAction(decision==='approve'?explanation:'이 환불 요청을 반려합니다.',{title:'환불 요청 처리',confirmLabel:decision==='approve'?label:'요청 반려'}))return;
  setBusy(true);
  try{const response=await fetch(withBase('/api/admin-refund-review'),{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({refundId:refund.id,decision})});const result=await response.json();if(!response.ok)throw Error(result.error);setMessage(decision==='approve'?(result.virtual?'가상 결제 취소 및 권한 회수 완료':'카드 결제 취소 및 권한 회수 완료'):'환불 요청을 반려했습니다.');}catch(error){setMessage(error.message);setBusy(false);}
 }
 if (!virtual && manual) return <ManualRefundRecord refund={refund} />;
 return <div className="refund-review-actions">{!virtual&&<button type="button" className="button outline" disabled={busy} onClick={inquire}>이니시스 거래 조회</button>}<button type="button" className="button danger" disabled={busy} onClick={()=>review('approve')}>{refund.status==='processing'?'처리 결과 확인':virtual?'가상 결제 환불 테스트':'카드 결제 전액 취소'}</button>{refund.status==='requested'&&<button type="button" className="button outline" disabled={busy} onClick={()=>review('reject')}>반려</button>}{message&&<p role="status">{message}</p>}</div>;
}
