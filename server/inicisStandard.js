// Server-only WEBSTANDARD adapter. Never import this module into browser code.
// Specification and endpoint map: manual.inicis.com/pay/stdpay_pc.html and general_pc.zip.
export function paymentTax(env, productId, amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('PG_AMOUNT_INVALID');
  const pg = env.PAYMENT_LIVE === 'true' || Boolean(env.INICIS_MID || env.INICIS_SIGN_KEY);
  let mode = 'taxable', contract = 'virtual';
  if (pg) {
    contract = env.INICIS_TAX_CONTRACT;
    if (!['taxable', 'exempt', 'merchant'].includes(contract)) throw new Error('PG_TAX_NOT_CONFIGURED');
    let policies;
    try { policies = JSON.parse(env.PAYMENT_PRODUCT_TAX_JSON); } catch { throw new Error('PG_TAX_NOT_CONFIGURED'); }
    if (!policies || Array.isArray(policies) || !Object.hasOwn(policies, productId)) throw new Error('PG_TAX_NOT_CONFIGURED');
    mode = policies[productId];
    if (!['taxable', 'exempt'].includes(mode)) throw new Error('PG_TAX_NOT_CONFIGURED');
    if (contract !== 'merchant' && contract !== mode) throw new Error('PG_TAX_CONTRACT_MISMATCH');
  }
  const supplyAmount = mode === 'exempt' ? amount : Math.round(amount / 1.1);
  return {version:1, mode, contract, totalAmount:amount, supplyAmount,
    taxAmount:amount - supplyAmount, taxFreeAmount:mode === 'exempt' ? amount : 0};
}

export async function inicisHash(value, algorithm = 'SHA-256') {
  const bytes = await crypto.subtle.digest(algorithm, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

export function inicisOrigin(env) {
  const url = new URL(env.SITE_ORIGIN);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('PG_ORIGIN_INVALID');
  return url.origin;
}

export async function inicisState(env, order, expires = Date.now() + 3600000) {
  const payload = [inicisOrigin(env), env.INICIS_MID, order.orderNumber, String(order.amount), String(expires)].join('|');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.INICIS_SIGN_KEY), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('payment-return|' + payload));
  return String(expires) + '.' + Array.from(new Uint8Array(signed), b => b.toString(16).padStart(2,'0')).join('');
}

export async function verifyInicisState(env, order, value) {
  if (!/^\d{13}\.[a-f0-9]{64}$/.test(String(value))) return false;
  const expires = Number(value.split('.')[0]);
  if (expires < Date.now() || expires > Date.now() + 3600000) return false;
  const expected = await inicisState(env, order, expires);
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ value.charCodeAt(i);
  return difference === 0;
}

export async function inicisRequestParams(env, order) {
  if (!env.INICIS_MID || !env.INICIS_SIGN_KEY) return {configured:false};
  if (!['test','live'].includes(env.INICIS_ENV)) throw new Error('PG_ENV_REQUIRED');
  if (!Number.isSafeInteger(Number(order.amount)) || Number(order.amount) <= 0) throw new Error('PG_AMOUNT_INVALID');
  const tax = paymentTax(env, order.productId, Number(order.amount));
  if (order.channel === 'mobile') return inicisMobileParams(env, order, tax);
  const origin = inicisOrigin(env), oid = order.orderNumber, price = String(order.amount), timestamp = String(Date.now());
  return {
    configured:true, live:env.INICIS_ENV === 'live', version:'1.0', mid:env.INICIS_MID, oid, price, timestamp,
    use_chkfake:'Y', signature:await inicisHash('oid=' + oid + '&price=' + price + '&timestamp=' + timestamp),
    verification:await inicisHash('oid=' + oid + '&price=' + price + '&signKey=' + env.INICIS_SIGN_KEY + '&timestamp=' + timestamp),
    mKey:await inicisHash(env.INICIS_SIGN_KEY), merchantData:await inicisState(env, order),
    goodname:order.productName, buyername:order.buyerName, buyeremail:order.buyerEmail || '', buyertel:order.buyerTel || '',
    returnUrl:origin + '/api/payment-approve', closeUrl:origin + '/mypage?payment=closed',
    gopaymethod:'Card', currency:'WON', acceptmethod:'centerCd(Y)', mobile:false,
    ...(tax.contract === 'merchant' ? {tax:String(tax.taxAmount), taxfree:String(tax.taxFreeAmount)} : {})
  };
}

// INIpay Mobile WEB: stdpay_m.html and official general_mo.zip/properties.js.
export async function inicisMobileHash(env, amount, oid, timestamp) {
  if (!env.INICIS_MOBILE_HASH_KEY) throw new Error('PG_MOBILE_KEY_REQUIRED');
  const digest = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(String(amount) + oid + timestamp + env.INICIS_MOBILE_HASH_KEY));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

export async function inicisMobileParams(env, order, tax) {
  if (env.INICIS_MOBILE_ENABLED !== 'true') throw new Error('PG_MOBILE_NOT_ENABLED');
  const oid = String(order.orderNumber), amount = Number(order.amount), timestamp = String(Date.now());
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(oid) || !Number.isSafeInteger(amount) || amount <= 0 || amount > 99999999) throw new Error('PG_MOBILE_ORDER_INVALID');
  const fit = (value, limit) => {
    let result='';
    for (const char of String(value)) {if (new TextEncoder().encode(result + char).length > limit) break; result+=char;}
    return result;
  };
  const fields = {
    P_INI_PAYMENT:'CARD', P_MID:env.INICIS_MID, P_OID:oid, P_AMT:String(amount),
    P_GOODS:fit(order.productName || 'MediHelpers',80), P_UNAME:fit(order.buyerName || 'MediHelpers',30),
    P_MOBILE:String(order.buyerTel || '').replace(/[^0-9-]/g,'').slice(0,15),
    P_EMAIL:new TextEncoder().encode(order.buyerEmail || '').length <= 30 ? order.buyerEmail || '' : '', P_MNAME:'메디헬퍼스',
    P_NEXT_URL:inicisOrigin(env) + '/api/payment-approve', P_CHARSET:'utf8',
    P_TIMESTAMP:timestamp, P_CHKFAKE:await inicisMobileHash(env, amount, oid, timestamp),
    P_RESERVED:'centerCd=Y&amt_hash=Y', P_NOTI:oid + '|' + await inicisState(env,order),
    ...(tax.contract === 'merchant' ? {P_TAX:String(tax.taxAmount),P_TAXFREE:String(tax.taxFreeAmount)} : {})
  };
  return {configured:true, mobile:true, live:env.INICIS_ENV === 'live',
    action:'https://mobile.inicis.com/smart/payment/', returnUrl:fields.P_NEXT_URL, fields};
}

export function inicisMobileReturn(body) {
  const match = /^([A-Za-z0-9_-]{1,40})\|(\d{13}\.[a-f0-9]{64})$/.exec(String(body.P_NOTI || ''));
  if (!match || (body.P_OID && body.P_OID !== match[1])) throw new Error('PG_MOBILE_RETURN_INVALID');
  return {oid:match[1],state:match[2]};
}

export function inicisMobileEndpoints(env, body) {
  const center = body.idc_name;
  if (!(env.INICIS_ENV === 'test' ? center === 'stg' : env.INICIS_ENV === 'live' && ['fc','ks'].includes(center))) throw new Error('PG_CENTER_INVALID');
  const base = 'https://' + center + 'mobile.inicis.com/smart/';
  if (body.P_REQ_URL !== base + 'payReq.ini') throw new Error('PG_ENDPOINT_INVALID');
  return {auth:base + 'payReq.ini',cancel:base + 'payNetCancel.ini'};
}

export async function inicisMobilePost(url, fields, fetcher = fetch) {
  const response = await fetcher(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
    headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fields)});
  if (!response.ok) throw new Error('PG_HTTP_ERROR');
  const text = await response.text();
  if (text.length > 65536) throw new Error('PG_RESPONSE_INVALID');
  if (text.trimStart().startsWith('{')) return JSON.parse(text);
  const pairs = new URLSearchParams(text), data = Object.create(null);
  for (const [key,value] of pairs) {
    if (!/^[A-Za-z0-9_]+$/.test(key) || Object.hasOwn(data,key)) throw new Error('PG_RESPONSE_INVALID');
    data[key] = value;
  }
  return data;
}

export function validateInicisMobileApproval(env, order, approval) {
  return approval?.P_STATUS === '00' && approval.P_MID === env.INICIS_MID && approval.P_OID === order.orderNumber
    && /^\d+$/.test(String(approval.P_AMT)) && Number(approval.P_AMT) === Number(order.amount)
    && approval.P_TYPE === 'CARD' && typeof approval.P_TID === 'string' && /^[A-Za-z0-9_-]{40}$/.test(approval.P_TID)
    && approval.P_TID.slice(10,20) === env.INICIS_MID;
}

export async function processInicisMobileApproval(env, order, body, capture, fetcher = fetch) {
  if (env.INICIS_MOBILE_ENABLED !== 'true' || !env.INICIS_MOBILE_HASH_KEY) throw new Error('PG_MOBILE_NOT_CONFIGURED');
  const endpoints = inicisMobileEndpoints(env,body);
  if (body.P_STATUS !== '00' || !/^\d+$/.test(String(body.P_AMT)) || Number(body.P_AMT) !== Number(order.amount)
    || !/^[A-Za-z0-9_-]{40}$/.test(String(body.P_TID)) || body.P_TID.slice(10,20) !== env.INICIS_MID) return {status:'rejected'};
  const claim = await env.DB.prepare("INSERT OR IGNORE INTO payment_pg_attempts (order_id, status) VALUES (?, 'approving')").bind(order.id).run();
  if (!claim.meta?.changes) return {status:'pending',duplicate:true};
  const mark = (status, code='') => env.DB.prepare('UPDATE payment_pg_attempts SET status=?, result_code=?, updated_at=CURRENT_TIMESTAMP WHERE order_id=?').bind(status,code,order.id).run();
  let approval;
  const compensate = async () => {
    let status='review';
    try {
      const timestamp=String(Date.now());
      const cancelled=await inicisMobilePost(endpoints.cancel,{P_MID:env.INICIS_MID,P_TID:body.P_TID,P_AMT:String(order.amount),
        P_OID:order.orderNumber,P_TIMESTAMP:timestamp,P_CHKFAKE:await inicisMobileHash(env,order.amount,order.orderNumber,timestamp)},fetcher);
      if (cancelled.P_STATUS === '00' && /^[A-Za-z0-9_-]{40}$/.test(String(cancelled.P_TID)) && cancelled.P_TID.slice(10,20) === env.INICIS_MID
        && (!approval?.P_TID || approval.P_TID === cancelled.P_TID)) status='net_cancelled';
    } catch { /* Preserve claim for reconciliation after an uncertain network result. */ }
    try { await mark(status); } catch { /* The original claim still prevents repeat approval. */ }
    return {status};
  };
  try { approval=await inicisMobilePost(endpoints.auth,{P_MID:env.INICIS_MID,P_TID:body.P_TID},fetcher); }
  catch { return compensate(); }
  if (typeof approval?.P_STATUS === 'string' && approval.P_STATUS !== '00') {await mark('rejected',approval.P_STATUS.slice(0,20));return {status:'rejected'};}
  if (!validateInicisMobileApproval(env,order,approval)) return compensate();
  try {await capture(approval.P_TID);return {status:'paid',tid:approval.P_TID};}
  catch {
    try {if ((await env.DB.prepare('SELECT status FROM payment_pg_attempts WHERE order_id=?').bind(order.id).first())?.status === 'captured') return {status:'paid',tid:approval.P_TID};}
    catch {return {status:'review'};}
    return compensate();
  }
}

export function inicisEndpoints(env, body) {
  const center = String(body.idc_name || '');
  const valid = env.INICIS_ENV === 'test' ? center === 'stg' : env.INICIS_ENV === 'live' && ['fc','ks'].includes(center);
  if (!valid) throw new Error('PG_CENTER_INVALID');
  const base = 'https://' + center + 'stdpay.inicis.com/api/';
  // Exact string comparison also rejects redirects, userinfo, query strings, alternate ports and encoded paths.
  if (body.authUrl !== base + 'payAuth' || body.netCancelUrl !== base + 'netCancel') throw new Error('PG_ENDPOINT_INVALID');
  return {auth:base + 'payAuth', cancel:base + 'netCancel'};
}

export async function inicisAuthFields(env, authToken) {
  if (typeof authToken !== 'string' || !authToken || authToken.length > 8192) throw new Error('PG_TOKEN_INVALID');
  const timestamp = String(Date.now());
  return {mid:env.INICIS_MID, authToken, timestamp,
    signature:await inicisHash('authToken=' + authToken + '&timestamp=' + timestamp),
    verification:await inicisHash('authToken=' + authToken + '&signKey=' + env.INICIS_SIGN_KEY + '&timestamp=' + timestamp),
    charset:'UTF-8', format:'JSON'};
}

export async function inicisPost(url, fields, fetcher = fetch) {
  const response = await fetcher(url, {method:'POST', redirect:'error', signal:AbortSignal.timeout(15000),
    headers:{'content-type':'application/x-www-form-urlencoded'}, body:new URLSearchParams(fields)});
  if (!response.ok) throw new Error('PG_HTTP_ERROR');
  return response.json();
}

export function validateInicisApproval(env, order, approval) {
  return approval?.resultCode === '0000' && approval.mid === env.INICIS_MID && approval.MOID === order.orderNumber
    && /^\d+$/.test(String(approval.TotPrice)) && Number(approval.TotPrice) === Number(order.amount)
    && approval.payMethod === 'Card' && typeof approval.tid === 'string' && /^[A-Za-z0-9_-]{10,80}$/.test(approval.tid);
}

// Persistent claim is acquired BEFORE any network request and is never automatically recycled.
// A crashed/ambiguous attempt must be reconciled by an operator rather than charged again.
export async function processInicisApproval(env, order, body, capture, fetcher = fetch) {
  const endpoints = inicisEndpoints(env, body);
  if (body.mid !== env.INICIS_MID || body.resultCode !== '0000') return {status:'rejected'};
  const fields = await inicisAuthFields(env, body.authToken);
  const claim = await env.DB.prepare("INSERT OR IGNORE INTO payment_pg_attempts (order_id, status) VALUES (?, 'approving')").bind(order.id).run();
  if (!claim.meta?.changes) return {status:'pending', duplicate:true};
  const mark = async (status, code = '') => {
    await env.DB.prepare('UPDATE payment_pg_attempts SET status=?, result_code=?, updated_at=CURRENT_TIMESTAMP WHERE order_id=?').bind(status, code, order.id).run();
  };
  const compensate = async () => {
    let status = 'review';
    try {
      const cancelled = await inicisPost(endpoints.cancel, fields, fetcher);
      if (cancelled.resultCode === '0000' && cancelled.mid === env.INICIS_MID && cancelled.MOID === order.orderNumber) status = 'net_cancelled';
    } catch { /* Keep the persistent claim; never infer that timeout means failure. */ }
    try { await mark(status); } catch { /* 'approving' still blocks a repeat charge. */ }
    return {status};
  };
  let approval;
  try { approval = await inicisPost(endpoints.auth, fields, fetcher); }
  catch { return compensate(); }
  if (typeof approval?.resultCode === 'string' && approval.resultCode !== '0000') {
    await mark('rejected', approval.resultCode.slice(0,20));
    return {status:'rejected'};
  }
  if (!validateInicisApproval(env, order, approval)) return compensate();
  try {
    await capture(approval.tid);
    // Capture callback MUST atomically mark this attempt captured with the order and ledger.
    return {status:'paid', tid:approval.tid};
  } catch {
    // D1 response loss can occur AFTER commit. Never cancel a confirmed committed capture.
    try {
      const stored = await env.DB.prepare('SELECT status FROM payment_pg_attempts WHERE order_id=?').bind(order.id).first();
      if (stored?.status === 'captured') return {status:'paid', tid:approval.tid};
    } catch { return {status:'review'}; }
    return compensate();
  }
}

// Full card refunds only. Do not enable until INIAPI/IP use is confirmed for this merchant.
export async function inicisRefundFields(env, tid, reason, now = new Date()) {
  if (!env.INICIS_API_KEY || !env.INICIS_MID || !['test','live'].includes(env.INICIS_ENV)) throw new Error('PG_REFUND_NOT_CONFIGURED');
  const ip = String(env.INICIS_CLIENT_IP || '');
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip) || ip.split('.').some(n=>Number(n)>255)) throw new Error('PG_CLIENT_IP_REQUIRED');
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(tid)) throw new Error('PG_TID_INVALID');
  const timestamp = new Date(now.getTime()+9*3600000).toISOString().replace(/[-:T]/g,'').slice(0,14);
  const fields = {type:'Refund',paymethod:'Card',timestamp,clientIp:ip,mid:env.INICIS_MID,tid,msg:String(reason || '회원 요청 전액 취소').slice(0,25)};
  fields.hashData = await inicisHash(env.INICIS_API_KEY + fields.type + fields.paymethod + timestamp + ip + fields.mid + tid,'SHA-512');
  return fields;
}

export async function processInicisRefund(env, refund, tid, finalize, fetcher = fetch) {
  const fields = await inicisRefundFields(env, tid, refund.reason);
  const claim = await env.DB.prepare("INSERT OR IGNORE INTO payment_pg_refunds (order_id, refund_id, status) VALUES (?, ?, 'processing')").bind(refund.orderId, refund.id).run();
  if (!claim.meta?.changes) {
    const prior = await env.DB.prepare('SELECT refund_id AS refundId, status FROM payment_pg_refunds WHERE order_id=?').bind(refund.orderId).first();
    if (prior?.refundId !== refund.id || !['provider_confirmed','completed'].includes(prior.status)) return {status:'review'};
    if (prior.status === 'completed') return {status:'refunded',duplicate:true};
  } else {
    const endpoint = env.INICIS_ENV === 'test' ? 'https://stginiapi.inicis.com/api/v1/refund' : 'https://iniapi.inicis.com/api/v1/refund';
    let outcome;
    try { outcome = await inicisPost(endpoint, fields, fetcher); }
    catch { return {status:'review'}; }
    if (outcome?.resultCode !== '00') {
      // Non-success including malformed responses cannot be retried automatically.
      await env.DB.prepare("UPDATE payment_pg_refunds SET status='review' WHERE order_id=?").bind(refund.orderId).run();
      return {status:'review'};
    }
    try { await env.DB.prepare("UPDATE payment_pg_refunds SET status='provider_confirmed',updated_at=CURRENT_TIMESTAMP WHERE order_id=?").bind(refund.orderId).run(); }
    catch { return {status:'review'}; }
  }
  try { await finalize(); return {status:'refunded'}; }
  catch { return {status:'pending_local'}; }
}

// Read-only INIAPI V2 inquiry. Never turn a query into a capture/refund or rights update.
// https://manual.inicis.com/pay/etc-inquiry.html
export async function inquireInicisCard(env, order, tid, fetcher = fetch, now = new Date()) {
  if (!env.INICIS_API_KEY || !/^[A-Za-z0-9_]{10}$/.test(env.INICIS_MID || '') || !['test','live'].includes(env.INICIS_ENV)) throw new Error('PG_INQUIRY_NOT_CONFIGURED');
  const clientIp = String(env.INICIS_CLIENT_IP || '');
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(clientIp) || clientIp.split('.').some(n=>Number(n)>255)) throw new Error('PG_CLIENT_IP_REQUIRED');
  if (!/^[A-Za-z0-9_-]{40}$/.test(tid || '')) throw new Error('PG_TID_INVALID');
  if (!Number.isSafeInteger(order.totalAmount) || order.totalAmount <= 0 || !order.orderNumber) throw new Error('PG_AMOUNT_INVALID');
  const timestamp = new Date(now.getTime()+9*3600000).toISOString().replace(/[-:T]/g,'').slice(0,14);
  const data = {tid};
  const fields = {mid:env.INICIS_MID,type:'inquiry',timestamp,clientIp,data,
    hashData:await inicisHash(env.INICIS_API_KEY+env.INICIS_MID+'inquiry'+timestamp+JSON.stringify(data),'SHA-512')};
  const endpoint = env.INICIS_ENV === 'test' ? 'https://stginiapi.inicis.com/v2/pg/inquiry' : 'https://iniapi.inicis.com/v2/pg/inquiry';
  const response = await fetcher(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
    headers:{'content-type':'application/json'},body:JSON.stringify(fields)});
  if (!response.ok) throw new Error('PG_HTTP_ERROR');
  const raw = await response.text();
  if (raw.length > 65536) throw new Error('PG_RESPONSE_INVALID');
  let result; try {result=JSON.parse(raw);} catch {throw new Error('PG_RESPONSE_INVALID');}
  if (result?.resultCode !== 'SUCCESS') throw new Error('PG_INQUIRY_UNCONFIRMED');
  if (result.mid !== env.INICIS_MID || result.tid !== tid || result.oid !== order.orderNumber
    || !/^\d{1,12}$/.test(result.price) || Number(result.price) !== order.totalAmount
    || !['Card','VCard'].includes(result.paymethod)) throw new Error('PG_INQUIRY_MISMATCH');
  if (!['APPROVAL','CANCEL','PART_CANCEL'].includes(result.transactionStatus)) throw new Error('PG_INQUIRY_UNCONFIRMED');
  const matched = (result.transactionStatus === 'APPROVAL' && order.status === 'paid')
    || (result.transactionStatus === 'CANCEL' && order.status === 'refunded');
  // Allow-list response fields: buyer/card/bank details and provider messages never leave this adapter.
  return {providerStatus:result.transactionStatus,localStatus:order.status,amount:order.totalAmount,
    matched,reconciliationRequired:!matched,checkedAt:now.toISOString()};
}
