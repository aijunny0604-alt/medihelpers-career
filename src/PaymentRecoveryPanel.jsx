import { useRef, useState } from 'react';
import { withBase } from './basePath.js';

export default function PaymentRecoveryPanel({ order, message, onRecovered }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(message);
  const inFlight = useRef(false);
  const retry = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const response = await fetch(withBase('/api/payment-approve'), {
        method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderNumber: order.orderNumber }),
      });
      const result = await response.json();
      if (!response.ok || !result.approved) throw new Error(result.error || result.message || '주문 상태를 확인하지 못했습니다.');
      onRecovered(result);
    } catch (failure) {
      setError(failure.message || '연결을 확인하고 다시 시도해주세요.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return <section className="section"><div className="checkout-success" role="status">
    <h2>기존 주문의 처리 결과를 확인해주세요</h2>
    <p>주문번호 {order.orderNumber}<br />새 주문을 만들지 않고 같은 주문으로 다시 확인합니다.</p>
    {error && <p role="alert">{error}</p>}
    <button className="button primary" type="button" disabled={busy} onClick={retry}>{busy ? '확인 중…' : '같은 주문 다시 확인'}</button>
    <a className="button outline" href={withBase('/mypage')}>마이페이지에서 확인</a>
  </div></section>;
}
