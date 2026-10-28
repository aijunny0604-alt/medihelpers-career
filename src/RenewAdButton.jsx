import React, { useEffect, useRef, useState } from 'react';
import { withBase } from './basePath.js';
import { PRIVACY_FORM_VERSION } from './privacyConsent.js';
import { openInicisPayment, inicisPaymentChannel } from './inicisPay.js';
import { confirmAction } from './confirmAction.js';
import { usePaymentRecovery } from './usePaymentRecovery.js';
import PaymentRecoveryPanel from './PaymentRecoveryPanel.jsx';
import { isConfirmedPayment, postPayment } from './paymentApi.js';
export default function RenewAdButton({ ad, auth }) {
  const [order, setOrder, rememberOrder] = usePaymentRecovery(auth, `renew:${ad.contentRecordId}`);
  const completed = () => { setOrder(null); window.location.assign(withBase(`/jobs/admin-${encodeURIComponent(ad.contentRecordId)}`)); };
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current=true; return () => { mounted.current=false; }; }, []);
  async function renew() {
    if (inFlight.current) return;
    inFlight.current=true;
    setBusy(true);setError('');
    let createdOrder=null;
    let opened=false;
    const release=()=>{inFlight.current=false;if(mounted.current){setBusy(false);if(createdOrder)setOrder(createdOrder);}};
    try {
      if (!await confirmAction(`${ad.title}\n${ad.plan} · 결제 완료일부터 30일 다시 노출합니다. 기존 공고 내용과 이미지를 그대로 사용합니다. 상품·환불 조건은 결제 내역의 환불 안내에서 확인할 수 있습니다.`,{title:'공고를 다시 노출할까요?',confirmLabel:'동의하고 재구매'}) || !mounted.current) return;
      const {response,result}=await postPayment('/api/payment-orders',{renewContentId:ad.contentRecordId,productId:ad.productId,paymentChannel:inicisPaymentChannel(),checkoutAcknowledged:true,privacyVersion:PRIVACY_FORM_VERSION});
      if(result.recoveryOrder?.orderNumber){rememberOrder(result.recoveryOrder);if(mounted.current)setOrder(result.recoveryOrder);}
      if(!response.ok) throw Error(result.error);
      createdOrder=result.order;
      rememberOrder(createdOrder);
      if(!mounted.current) return;
      // SDK 준비·결제창이 열린 동안에는 별도의 재개 버튼을 함께 표시하지 않는다.
      if(result.inicis?.configured){await openInicisPayment(result.inicis,result.order,{onClose:release,shouldOpen:()=>mounted.current});opened=true;return;}
      const {response:approval,result:approved}=await postPayment('/api/payment-approve',{orderNumber:result.order.orderNumber});
      if(!approval.ok || !isConfirmedPayment(approved,result.order.orderNumber)) throw Error(approved.error || '결제를 완료하지 못했습니다. 결제 내역에서 확인해주세요.');
      rememberOrder(null);
      if(!mounted.current) return;
      completed();
    }catch(failure){
      if(mounted.current){
        if(createdOrder?.orderNumber) setOrder(createdOrder);
        else if(failure.code==='PAYMENT_RESULT_UNKNOWN') setOrder({});
        setError(failure.message || '결제 요청을 확인하지 못했습니다. 결제 내역에서 기존 주문을 확인해주세요.');
      }
    }finally{if(!opened){inFlight.current=false;if(mounted.current)setBusy(false);}}
  }
  if(order || (ad.isRenewal && ad.status === '결제 대기')) return <PaymentRecoveryPanel order={order || {orderNumber:ad.id}} message={error} onRecovered={completed} />;
  return <div className="renew-ad-action"><button className="button primary" type="button" disabled={busy} onClick={renew}>{busy ? '결제 처리 중…' : '재구매 · 30일 다시 노출'}</button><a href={withBase('/refund')}>환불 조건 확인</a>{error && <p role="alert" className="form-error">{error}</p>}</div>;
}
