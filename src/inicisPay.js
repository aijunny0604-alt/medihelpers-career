// 이니시스 웹표준결제(WEBSTANDARD) 클라이언트 연동.
// 서버(/api/payment-orders)가 내려준 inicis 파라미터로 표준결제창을 띄운다.
// 실제 키(INICIS_MID/INICIS_SIGN_KEY)가 설정된 배포 환경에서만 configured:true로 내려온다.
// 운영 환경은 키가 없으면 서버에서 차단한다. 가상 승인은 로컬 테스트에서만 사용한다.

const STDPAY_SCRIPT_TEST = 'https://stgstdpay.inicis.com/stdjs/INIStdPay.js';
const STDPAY_SCRIPT_LIVE = 'https://stdpay.inicis.com/stdjs/INIStdPay.js';

let scriptPromise = null;

export function inicisPaymentChannel(nav = globalThis.navigator) {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(nav?.userAgent || '') || (/Mac/i.test(nav?.platform || '') && nav?.maxTouchPoints > 1) ? 'mobile' : 'pc';
}

// INIpay Mobile requires the originating iOS app's scheme after app-card
// authentication. Select only documented browser schemes, never a URL supplied
// by a caller. Safari and Android keep the provider's normal return behavior.
export function inicisMobileBrowserScheme(nav = globalThis.navigator) {
  const ua = nav?.userAgent || '';
  if (!/iPhone|iPad|iPod/i.test(ua) && !(/Mac/i.test(nav?.platform || '') && nav?.maxTouchPoints > 1)) return '';
  if (/KAKAOTALK/i.test(ua)) return 'kakaotalk://';
  if (/NAVER\(/i.test(ua)) return 'naversearchapp://';
  if (/FBAN\/|FBAV\/|FBIOS/i.test(ua)) return 'fb://';
  if (/DaumApps\/|Daum\/|DaumDevice\//i.test(ua)) return 'daumapps://open';
  if (/CriOS\//i.test(ua)) return 'googlechromes://';
  return '';
}

// 이니시스 표준결제 스크립트를 1회만 로드한다(중복 로드 시 결제창이 중복 호출됨).
export function loadInicisScript(live = true, { timeoutMs = 15000 } = {}) {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (typeof window.INIStdPay?.pay === 'function') return resolve(window.INIStdPay);
    const script = document.createElement('script');
    script.src = live ? STDPAY_SCRIPT_LIVE : STDPAY_SCRIPT_TEST;
    script.async = true;
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (error) {
        script.remove();
        reject(error);
      } else resolve(window.INIStdPay);
    };
    const timer = setTimeout(() => finish(new Error('결제 모듈 응답이 지연됩니다. 같은 주문의 결제창을 다시 열어주세요.')), timeoutMs);
    script.onload = () => finish(typeof window.INIStdPay?.pay === 'function' ? null : new Error('결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    script.onerror = () => finish(new Error('결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    try { document.head.appendChild(script); }
    catch { finish(new Error('결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')); }
  }).catch(error => {
    scriptPromise = null;
    throw error;
  });
  return scriptPromise;
}

// 이니시스 규격 필수 파라미터로 숨김 폼을 만든다. INIStdPay.pay(formId)가 이 폼을 읽어 결제창을 연다.
function buildPayForm(inicis, order) {
  const formId = 'inicis-pay-form';
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
    verification: inicis.verification,
    use_chkfake: 'Y',
    merchantData: inicis.merchantData,
    mKey: inicis.mKey,
    currency: 'WON',
    goodname: inicis.goodname || order.productName || '메디헬퍼스 서비스',
    buyername: inicis.buyername || order.buyerName || '',
    buyertel: inicis.buyertel || order.buyerTel || '',
    buyeremail: inicis.buyeremail || order.buyerEmail || '',
    gopaymethod: inicis.gopaymethod || 'Card',
    // 결제창 인증 결과를 받을 서버 주소(이니시스에 등록된 도메인이어야 함)
    returnUrl: inicis.returnUrl,
    closeUrl: inicis.closeUrl,
    acceptmethod: inicis.acceptmethod || 'centerCd(Y)',
    tax: inicis.tax,
    taxfree: inicis.taxfree,
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
export async function openInicisPayment(inicis, order = {}, {onClose, shouldOpen = () => true} = {}) {
  const checkCurrentView = () => {
    if (!shouldOpen()) throw Object.assign(new Error('결제 화면을 벗어나 결제창을 열지 않았습니다. 기존 주문을 확인해주세요.'), {code:'PAYMENT_VIEW_CLOSED'});
  };
  checkCurrentView();
  if (!inicis?.configured) throw new Error('결제 설정이 준비되지 않았습니다.');
  if (!inicis.returnUrl) throw new Error('결제 결과 수신 주소가 설정되지 않았습니다.');
  if (inicis.mobile) {
    if (inicis.action !== 'https://mobile.inicis.com/smart/payment/' || !inicis.fields?.P_CHKFAKE) throw new Error('모바일 결제 설정을 확인해주세요.');
    const fields = {...inicis.fields};
    const scheme = inicisMobileBrowserScheme();
    if (scheme) {
      const options = new URLSearchParams(fields.P_RESERVED || '');
      options.set('app_scheme', scheme);
      // INIpay expects an ampersand-delimited option string, including literal ://.
      fields.P_RESERVED = Array.from(options, ([key,value]) => key + '=' + value).join('&');
    }
    const form = document.createElement('form');
    form.method = 'POST'; form.action = inicis.action; form.target = '_self';
    form.acceptCharset = 'euc-kr'; form.style.display = 'none';
    for (const [name,value] of Object.entries(fields)) {
      if (!/^P_[A-Z0-9_]+$/.test(name) || typeof value !== 'string') throw new Error('모바일 결제 정보가 올바르지 않습니다.');
      const input = document.createElement('input'); input.type='hidden'; input.name=name; input.value=value; form.appendChild(input);
    }
    document.body.appendChild(form); form.submit(); return;
  }
  const INIStdPay = await loadInicisScript(inicis.live !== false);
  // Loading the SDK may take seconds; navigating away must not open a stale payment window.
  checkCurrentView();
  if (typeof onClose === 'function' && typeof INIStdPay.viewOff === 'function') {
    const original = INIStdPay.viewOff.__medihelpersOriginal || INIStdPay.viewOff;
    let closed = false;
    const wrapped = function (...args) {
      try { return original.apply(this,args); }
      finally { if (!closed) { closed=true; onClose(); } }
    };
    wrapped.__medihelpersOriginal = original;
    INIStdPay.viewOff = wrapped;
  }
  const formId = buildPayForm(inicis, order);
  INIStdPay.pay(formId);
}
