// A return URL is only a hint. Completion is derived from the signed-in member's orders.
export function paymentReturnNotice(orderNumber, orders = []) {
  const order = typeof orderNumber === 'string' && orderNumber.trim()
    ? (Array.isArray(orders) ? orders : []).find(item => item?.orderNumber === orderNumber) : null;
  if (order?.status === 'paid') return {
    tone: 'ok', title: '결제가 완료되었습니다',
    message: '회원님의 결제 내역에서 승인 상태를 확인했습니다. 상품 이용 상태는 아래 내역에서 확인해주세요.',
  };
  if (['refunded', 'partially_refunded'].includes(order?.status)) return {
    tone: 'fail', title: order.status === 'refunded' ? '환불된 결제입니다' : '일부 환불된 결제입니다',
    message: '최신 결제 내역과 환불 처리 상태를 아래에서 확인해주세요.',
  };
  return {
    tone: 'fail', title: '결제 결과를 확인해주세요',
    message: '현재 승인 완료를 확인하지 못했습니다. 새로 결제하기 전에 아래 내역에서 기존 주문을 확인해주세요.',
  };
}
