import React, { useEffect, useState } from 'react';
import { DEMO_MODE } from './demoMode.js';

// Informational only: payment authorization remains enforced by the server.
export default function CheckoutAvailabilityNotice() {
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    if (DEMO_MODE) return;
    const controller = new AbortController();
    fetch('/api/service-status', { signal:controller.signal, cache:'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Service status unavailable');
        const data = await response.json();
        setStatus(data.checkoutEnabled === true ? 'open' : 'paused');
      })
      .catch(error => { if (error.name !== 'AbortError') setStatus('unknown'); });
    return () => controller.abort();
  }, []);
  if (DEMO_MODE || status === 'open') return null;
  return <div className="price-principle" role="status" aria-live="polite"><div>
    <strong>{status === 'paused' ? '현재 새 결제는 중단되어 있습니다' : status === 'loading' ? '결제 이용 가능 여부를 확인하고 있습니다' : '결제 이용 가능 여부를 확인하지 못했습니다'}</strong>
    <p>{status === 'paused' ? '아래는 정상 운영 시의 상품·게시 절차 안내입니다. 현재는 상품 정보만 확인할 수 있으며 결제와 신규 광고 게시는 진행되지 않습니다. 이미 결제한 건은 반복 결제하지 말고 담당자에게 확인해주세요.' : status === 'loading' ? '확인이 끝난 뒤 신청을 진행해주세요.' : '새로고침 후 다시 확인해주세요. 결제 결과가 불명확하면 반복 결제하지 마세요.'}</p>
  </div></div>;
}
