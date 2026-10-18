import React from 'react';
import { formatAdminTime } from './adminStorage.js';

export const refundStatusLabel = { requested:'접수 · 금액 검토 중', processing:'처리 중', succeeded:'환불 완료', rejected:'반려', failed:'처리 확인 필요', cancelled:'요청 취소' };

export default function RefundHistory({ refunds = [] }) {
  if (!refunds.length) return null;
  return <section className="member-refund-history" aria-label="환불 요청 및 처리 결과">
    <h4>환불 요청 및 처리 결과</h4>
    {refunds.map(refund => <div key={refund.id} className={`refund-history-item ${refund.status}`}>
      <strong>{refundStatusLabel[refund.status] || '확인 중'}{refund.status==='succeeded' ? ` · ${Number(refund.amount).toLocaleString('ko-KR')}원` : ''}</strong>
      <small>접수 {formatAdminTime(refund.createdAt)}{refund.processedAt ? ` · 처리 ${formatAdminTime(refund.processedAt)}` : ''}</small>
      <p>신청 사유: {refund.reason}</p>
      {refund.customerMessage ? <p><b>{refund.status==='rejected'?'반려 사유':'처리 안내'}:</b> {refund.customerMessage}</p>
        : ['requested','processing'].includes(refund.status) ? <p>담당자가 이용 내역과 환불 금액을 확인하고 있습니다. 결과는 이 화면과 홈페이지 알림에서 확인할 수 있습니다.</p>
          : <p>{refund.status==='succeeded'?'환불 완료 기록이 반영되었습니다. 카드사 반영까지 추가 시간이 걸릴 수 있습니다.':'자세한 처리 내용은 고객센터에 문의해 주세요.'}</p>}
    </div>)}
  </section>;
}
