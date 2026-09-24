import React, { useState } from 'react';
import { withBase } from './basePath.js';
import { PRIVACY_FORM_VERSION } from './privacyConsent.js';
import { openInicisPayment } from './inicisPay.js';
import { confirmAction } from './confirmAction.js';
import { usePaymentRecovery } from './usePaymentRecovery.js';
import PaymentRecoveryPanel from './PaymentRecoveryPanel.jsx';
export default function RenewAdButton({ ad, auth }) {
  const [order, setOrder] = usePaymentRecovery(auth, `renew:${ad.contentRecordId}`);
  const completed = () => { setOrder(null); window.location.assign(withBase(`/jobs/admin-${encodeURIComponent(ad.contentRecordId)}`)); };
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  async function renew() {
    if (!await confirmAction(`${ad.title}\n${ad.plan} · 결제 완료일부터 30일 다시 노출합니다. 기존 공고 내용과 이미지를 그대로 사용합니다. 상품·환불 조건은 결제 내역의 환불 안내에서 확인할 수 있습니다.`,{title:'공고를 다시 노출할까요?',confirmLabel:'동의하고 재구매'})) return;
    setBusy(true);setError('');
    try {
      const response=await fetch(withBase('/api/payment-orders'),{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({renewContentId:ad.contentRecordId,productId:ad.productId,checkoutAcknowledged:true,privacyVersion:PRIVACY_FORM_VERSION})});
      const result=await response.json();
      if(result.recoveryOrder) setOrder(result.recoveryOrder);
      if(!response.ok) throw Error(result.error);
      setOrder(result.order);
      if(result.inicis?.configured){await openInicisPayment(result.inicis);return;}
      const approval=await fetch(withBase('/api/payment-approve'),{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({orderNumber:result.order.orderNumber})});
      const approved=await approval.json();
      if(!approval.ok || !approved.approved) throw Error(approved.error || '결제를 완료하지 못했습니다. 결제 내역에서 확인해주세요.');
      completed();
    }catch(failure){setError(failure.message);setBusy(false);}
  }
  if(order || (ad.isRenewal && ad.status === '결제 대기')) return <PaymentRecoveryPanel order={order || {orderNumber:ad.id}} message={error} onRecovered={completed} />;
  return <div className="renew-ad-action"><button className="button primary" type="button" disabled={busy} onClick={renew}>{busy ? '결제 처리 중…' : '재구매 · 30일 다시 노출'}</button><a href={withBase('/refund')}>환불 조건 확인</a>{error && <p role="alert" className="form-error">{error}</p>}</div>;
}
