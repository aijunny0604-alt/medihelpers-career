import React from 'react';
import {formatAdminTime} from './adminStorage.js';

export default function PaymentExceptions({queue}) {
  if (!queue?.total) return null;
  const labels={approving:'승인 응답 확인 중',processing:'취소 응답 확인 중',review:'결과 대조 필요',provider_confirmed:'PG 취소 확인 · 홈페이지 반영 필요'};
  return <section className="payment-exceptions" aria-label="결제 결과 확인 필요">
    <h3>결제 결과 확인 필요 · {queue.total}건</h3>
    <p>진행 중이거나 결과 대조가 필요한 거래입니다. 이니시스 관리자에서 주문번호·거래번호·금액을 확인하세요. 결과 확인 전 재결제·중복 취소·임의 권한 발급을 하지 마세요.</p>
    <p>방금 시작한 거래는 정상 처리 중일 수 있습니다. 페이지를 새로고침해 상태를 확인하세요. 아래 표시는 홈페이지 처리 기록이며 PG의 현재 상태를 자동 조회한 결과가 아닙니다.</p>
    {queue.total>queue.items.length && <p role="status">전체 {queue.total}건 중 오래된 {queue.items.length}건을 표시합니다. 추가 미확인 거래가 남아 있습니다.</p>}
    <div className="payment-exceptions-table"><table><thead><tr><th>주문번호 / 원 거래번호</th><th>구분</th><th>금액</th><th>확인할 상태</th><th>마지막 기록</th></tr></thead>
      <tbody>{queue.items.map(row=><tr key={row.kind+row.orderNumber}><td>{row.orderNumber}<small>{row.tid || '거래번호 미확보 · 주문번호로 확인'}</small></td><td>{row.kind==='approval'?'승인':'취소'}</td><td>{Number(row.amount).toLocaleString()}원</td><td>{labels[row.status] || row.status}</td><td>{formatAdminTime(row.updatedAt)}</td></tr>)}</tbody></table></div>
  </section>;
}
