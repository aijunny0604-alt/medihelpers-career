import React, { useState } from 'react';
import { confirmAction } from './confirmAction.js';
import { withBase } from './basePath.js';
export default function RefundReview({ refund, virtual = true }) {
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
 return <div className="refund-review-actions">{!virtual&&<button type="button" className="button outline" disabled={busy} onClick={inquire}>이니시스 거래 조회</button>}<button type="button" className="button danger" disabled={busy} onClick={()=>review('approve')}>{refund.status==='processing'?'처리 결과 확인':virtual?'가상 결제 환불 테스트':'카드 결제 전액 취소'}</button>{refund.status==='requested'&&<button type="button" className="button outline" disabled={busy} onClick={()=>review('reject')}>반려</button>}{message&&<p role="status">{message}</p>}</div>;
}
