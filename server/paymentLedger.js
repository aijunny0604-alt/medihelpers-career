export function ledgerDateRange(start, end) {
  const date = value => {
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('INVALID_DATE_RANGE');
    const ms=Date.parse(value+'T00:00:00Z');
    if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==value)throw Error('INVALID_DATE_RANGE');
    return ms;
  };
  const first=date(start),last=date(end);
  if(last<first||last-first>30*86400000)throw Error('INVALID_DATE_RANGE');
  return {from:new Date(first-9*3600000).toISOString(),until:new Date(last+15*3600000).toISOString()};
}

export function ledgerKst(value) {
  if(!value)return '';
  const text=String(value),ms=Date.parse(text.includes('T')?text:text.replace(' ','T')+'Z');
  return Number.isFinite(ms)?new Date(ms+9*3600000).toISOString().slice(0,19).replace('T',' '):'';
}

export function paymentLedgerCsv(rows) {
  const cell=value=>{
    let s=String(value??'');
    // Prevent spreadsheet formula execution, including after leading whitespace.
    if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
    return '"'+s.replaceAll('"','""')+'"';
  };
  const table=[['주문번호','원 거래번호(TID)','거래구분','금액(원)','홈페이지 기록시각(KST)','PG 취소시각(KST)','현재 주문상태','확인방식']];
  for(const row of rows) {
    if(!Number.isSafeInteger(row.amount)||row.amount<0)throw Error('INVALID_LEDGER_AMOUNT');
    table.push([row.orderNumber,row.tid,row.kind==='capture'?'승인':'취소',row.amount,ledgerKst(row.recordedAt),ledgerKst(row.canceledAt),row.orderStatus,
      row.kind==='capture'?'홈페이지 승인원장':row.manual?'운영자 확인':'자동 취소원장']);
  }
  return '\uFEFF'+table.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}

export async function readPaymentLedger(db, start, end) {
  const range=ledgerDateRange(start,end);
  const result=await db.prepare(`SELECT o.order_number AS orderNumber,t.provider_transaction_id AS tid,
    t.transaction_type AS kind,t.amount,t.processed_at AS recordedAt,o.status AS orderStatus,
    CASE WHEN t.transaction_type='refund' AND e.id IS NOT NULL THEN 1 ELSE 0 END AS manual,
    CASE WHEN t.transaction_type='refund' THEN json_extract(e.detail_json,'$.canceledAt') ELSE NULL END AS canceledAt
    FROM payment_transactions t JOIN payment_orders o ON o.id=t.order_id
    LEFT JOIN payment_events e ON e.id='inicis-manual-refund-event-'||o.id
    WHERE t.provider='inicis' AND t.status='succeeded' AND t.transaction_type IN ('capture','refund')
      AND datetime(t.processed_at)>=datetime(?) AND datetime(t.processed_at)<datetime(?)
    ORDER BY datetime(t.processed_at),t.id LIMIT 10001`).bind(range.from,range.until).all();
  const rows=result.results||[];
  if(rows.length>10000)throw Error('LEDGER_RANGE_TOO_LARGE');
  return paymentLedgerCsv(rows);
}
