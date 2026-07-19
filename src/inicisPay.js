// 이니시스 웹표준결제(WEBSTANDARD) 클라이언트 연동.
// 서버(/api/payment-orders)가 내려준 inicis 파라미터로 표준결제창을 띄운다.
// 실제 키(INICIS_MID/INICIS_SIGN_KEY)가 설정된 배포 환경에서만 configured:true로 내려온다.
// 키가 없으면 서버가 테스트(가상) 승인으로 처리하므로 이 모듈은 호출되지 않는다.

const STDPAY_SCRIPT_TEST = 'https://stgstdpay.inicis.com/stdjs/INIStdPay.js';
const STDPAY_SCRIPT_LIVE = 'https://stdpay.inicis.com/stdjs/INIStdPay.js';

let scriptPromise = null;

// 이니시스 표준결제 스크립트를 1회만 로드한다(중복 로드 시 결제창이 중복 호출됨).
export function loadInicisScript(live = true) {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.INIStdPay) return resolve(window.INIStdPay);
    const script = document.createElement('script');
    script.src = live ? STDPAY_SCRIPT_LIVE : STDPAY_SCRIPT_TEST;
    script.async = true;
    script.onload = () => (window.INIStdPay ? resolve(window.INIStdPay) : reject(new Error('결제 모듈을 불러오지 못했습니다.')));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// 이니시스 규격 필수 파라미터로 숨김 폼을 만든다. INIStdPay.pay(formId)가 이 폼을 읽어 결제창을 연다.
function buildPayForm(inicis, order) {
  const formId = `inicis-pay-form-${Date.now()}`;
  const previous = document.getElementById(formId);
  if (previous) previous.remove();

  const form = document.createElement('form');
  form.id = formId;
  form.method = 'POST';
  form.style.display = 'none';

  const fields = {
    version: '1.0',
    mid: inicis.mid,
    oid: inicis.oid,
    price: String(inicis.price),
    timestamp: String(inicis.timestamp),
    signature: inicis.signature,
    mKey: inicis.mKey,
    currency: 'WON',
    goodname: order.productName || '메디헬퍼스 서비스',
    buyername: order.buyerName || '',
    buyertel: order.buyerTel || '',
    buyeremail: order.buyerEmail || '',
    gopaymethod: inicis.gopaymethod || 'Card',
    // 결제창 인증 결과를 받을 서버 주소(이니시스에 등록된 도메인이어야 함)
    returnUrl: inicis.returnUrl,
    closeUrl: inicis.closeUrl,
    acceptmethod: inicis.acceptmethod || 'HPP(1):below1000:va_receipt',
  };

  Object.entries(fields).forEach(([name, value]) => {
    if (value === undefined || value === null) return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  return formId;
}

/**
 * 이니시스 표준결제창을 연다.
 * @param {object} inicis 서버가 내려준 결제 파라미터(configured:true인 경우)
 * @param {object} order  { productName, buyerName, buyerTel, buyerEmail }
 * 결제창에서 인증이 끝나면 이니시스가 returnUrl(서버)로 POST하고, 서버가 승인·리다이렉트를 처리한다.
 */
export async function openInicisPayment(inicis, order = {}) {
  if (!inicis?.configured) throw new Error('결제 설정이 준비되지 않았습니다.');
  if (!inicis.returnUrl) throw new Error('결제 결과 수신 주소가 설정되지 않았습니다.');
  const INIStdPay = await loadInicisScript(inicis.live !== false);
  const formId = buildPayForm(inicis, order);
  INIStdPay.pay(formId);
}
