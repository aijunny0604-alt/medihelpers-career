import { useRef, useState } from 'react';
import { withBase } from './basePath.js';
import { PRIVACY_FORM_VERSION } from './privacyConsent.js';
import { openInicisPayment } from './inicisPay.js';
import { postPayment } from './paymentApi.js';

export default function PaymentRecoveryPanel({ order, message, onRecovered }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(message);
  const inFlight = useRef(false);
  const resume = async () => {
    if (inFlight.current) return;
    inFlight.current=true; setBusy(true); setError('');
    let opened=false;
    const release=()=>{inFlight.current=false;setBusy(false);};
    try {
      const {response,result}=await postPayment('/api/payment-orders',{resumeOrderNumber:order.orderNumber,privacyVersion:PRIVACY_FORM_VERSION,checkoutAcknowledged:true});
      if (!response.ok) throw Error(result.error || '주문을 확인하지 못했습니다.');
      if (result.alreadyPaid) { release(); await retry(); return; }
      await openInicisPayment(result.inicis,result.order,{onClose:release});
      opened=true;
    } catch(failure) { setError(failure.message || '결제창을 열지 못했습니다.'); }
    finally { if (!opened) release(); }
  };
  const retry = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const {response,result} = await postPayment('/api/payment-approve', {orderNumber:order.orderNumber});
      if (!response.ok || !result.approved) throw new Error(result.error || result.message || '주문 상태를 확인하지 못했습니다.');
      onRecovered(result);
    } catch (failure) {
      setError(failure.message || '연결을 확인하고 다시 시도해주세요.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  if (!order?.orderNumber) return <section className="section"><div className="checkout-success" role="status">
    <h2>결제 요청의 처리 결과를 확인해주세요</h2>
    <p role="alert">{error}</p>
    <p>주문이 저장되었을 수 있습니다. 중복 요청을 막기 위해 결제 내역으로 이동한 뒤 기존 주문을 확인해주세요.</p>
    <a className="button primary" href={withBase('/mypage?tab=payments')}>내 결제 내역 확인</a>
  </div></section>;
  return <section className="section"><div className="checkout-success" role="status">
    <h2>기존 주문의 처리 결과를 확인해주세요</h2>
    <p>주문번호 {order.orderNumber}<br />새 주문을 만들지 않고 같은 주문으로 다시 확인합니다.</p>
    {error && <p role="alert">{error}</p>}
    <button className="button primary" type="button" disabled={busy} onClick={retry}>{busy ? '확인 중…' : '같은 주문 다시 확인'}</button>
    <p>카드 인증을 시작하기 전에 창을 닫았다면 기존 금액·상품 조건으로 다시 열 수 있습니다. 승인 요청 이력이 있는 주문은 중복 결제를 막기 위해 재개하지 않습니다.</p>
    <button className="button outline" type="button" disabled={busy} onClick={resume}>같은 주문 결제창 다시 열기</button>
    <a href={withBase('/refund')}>상품·환불 조건 확인</a>
    <a className="button outline" href={withBase('/mypage?tab=payments')}>마이페이지에서 확인</a>
  </div></section>;
}
