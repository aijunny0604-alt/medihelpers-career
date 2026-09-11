import { useEffect, useState } from 'react';

export function usePaymentRecovery(auth, scope) {
  const key = `medihelpers_payment_recovery:${auth?.account?.id || ''}:${scope}`;
  const read = () => {
    try {
      const order = JSON.parse(sessionStorage.getItem(key) || 'null');
      return typeof order?.orderNumber === 'string' ? order : null;
    } catch { return null; }
  };
  const [state, setState] = useState(() => ({ key, order: read() }));
  useEffect(() => { setState({ key, order: read() }); }, [key]);
  const remember = order => {
    try {
      if (order) sessionStorage.setItem(key, JSON.stringify({ orderNumber: order.orderNumber }));
      else sessionStorage.removeItem(key);
    } catch { /* The active screen still supports recovery when storage is unavailable. */ }
  };
  const update = order => { remember(order); setState({ key, order }); };
  return [state.key === key ? state.order : null, update, remember];
}
