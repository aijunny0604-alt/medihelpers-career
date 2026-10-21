import { withBase } from './basePath.js';

function unknownResult(message) {
  return Object.assign(new Error(message), { code: 'PAYMENT_RESULT_UNKNOWN' });
}

export function isConfirmedPayment(result, orderNumber) {
  return typeof orderNumber === 'string' && orderNumber.trim().length > 0 &&
    result?.approved === true && result.orderNumber === orderNumber && result.status === 'paid';
}

// 응답 본문까지 시간을 제한한다. 시간 초과는 서버의 주문 취소를 뜻하지 않는다.
// 자동 재시도하지 않으며 호출 화면은 기존 주문/결제 내역으로 안내해야 한다.
export async function postPayment(path, body, { timeoutMs = 30000, fetchImpl = fetch } = {}) {
  if (!['/api/payment-orders', '/api/payment-approve'].includes(path)) throw new Error('잘못된 결제 요청입니다.');
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(unknownResult('결제 요청의 응답이 지연됩니다. 이미 처리되었을 수 있으니 기존 주문이나 마이페이지의 결제 내역을 확인해주세요.'));
      controller.abort();
    }, timeoutMs);
  });
  const request = (async () => {
    let response, result;
    try {
      response = await fetchImpl(withBase(path), {
        method: 'POST', credentials: 'same-origin', signal: controller.signal,
        headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      result = await response.json();
    } catch {
      throw unknownResult('결제 요청의 처리 결과를 확인하지 못했습니다. 새로 결제하기 전에 기존 주문이나 마이페이지의 결제 내역을 확인해주세요.');
    }
    const validOrderNumber = value => typeof value === 'string' && value.trim().length > 0;
    const invalidOrder = response.ok && path === '/api/payment-orders' && (
      !validOrderNumber(result?.order?.orderNumber) ||
      (body.resumeOrderNumber && result.order.orderNumber !== body.resumeOrderNumber) ||
      (result.alreadyPaid !== undefined && typeof result.alreadyPaid !== 'boolean') ||
      (result.alreadyPaid === true && result.order.status !== 'paid')
    );
    const invalidApproval = response.ok && path === '/api/payment-approve' && (
      typeof result?.approved !== 'boolean' ||
      !validOrderNumber(body.orderNumber) || result?.orderNumber !== body.orderNumber ||
      typeof result?.status !== 'string' || !result.status ||
      (result.approved === true && !isConfirmedPayment(result, body.orderNumber))
    );
    if (!result || typeof result !== 'object' || Array.isArray(result) || invalidOrder || invalidApproval) {
      throw unknownResult('결제 응답을 확인하지 못했습니다. 기존 주문이나 마이페이지의 결제 내역을 확인해주세요.');
    }
    return { response, result };
  })();
  try { return await Promise.race([request, deadline]); }
  finally { clearTimeout(timer); }
}
