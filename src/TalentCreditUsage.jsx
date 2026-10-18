import React from 'react';

export default function TalentCreditUsage({ usage }) {
  if (!usage) return null;
  return <div className="member-credit-usage" aria-label="주문별 열람권 사용 현황">
    <strong>열람권 {usage.purchased}건</strong>
    {usage.state === 'unpaid' ? <p>결제 승인 전 · 이용권이 지급되지 않았습니다.</p>
      : usage.state === 'pending' ? <p role="status">지급 확인 중입니다. 추가 결제하지 말고 같은 주문의 결과를 확인해주세요.</p>
      : usage.used === null ? <p>전액 환불로 이 주문의 열람 권한이 회수되었습니다.</p>
      : <p>지급 {usage.issued}건 · 사용 {usage.used}건 · 사용 가능 {usage.remaining}건{usage.held > 0 ? ` · 환불 검토 보류 ${usage.held}건` : ''}</p>}
    {usage.ended && usage.used !== null && <p>부분 환불로 미사용 이용권은 종료되었습니다. 이미 열람한 이력서는 작성자가 공개를 유지하는 동안 다시 볼 수 있습니다.</p>}
  </div>;
}
