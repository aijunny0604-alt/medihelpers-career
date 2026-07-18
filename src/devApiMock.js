// 로컬 개발 전용 가상 API 목(mock).
// 배포 빌드에는 절대 포함되지 않는다 — client.jsx에서 import.meta.env.DEV일 때만 install() 호출.
// OpenAI Sites 서버(scripts/package-sites.mjs)가 로컬에 없어 /api/*가 404이므로,
// 결제→열람권→상세공개, 이력서 저장 등 서버 흐름을 localStorage로 흉내내 화면을 검증할 수 있게 한다.

const LS = {
  orders: 'devmock_orders',
  unlocks: 'devmock_talent_unlocks',
  resumes: 'devmock_resumes',
};
const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k) || '') ?? fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const jsonRes = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// 서버 카탈로그와 동일(가격·타입). 열람권만 있으면 되므로 필요한 것만.
const CATALOG = {
  basic: { type: 'doctor_ad', name: '베이직 공고', amount: 59000 },
  featured: { type: 'doctor_ad', name: '추천 공고', amount: 149000 },
  intensive: { type: 'doctor_ad', name: '집중 채용', amount: 299000 },
  'doctor-single': { type: 'membership', name: '커리어 체크', amount: 19000 },
  'doctor-pass': { type: 'membership', name: '커리어 컨시어지', amount: 39000 },
  'talent-unlock-single': { type: 'talent_search', name: '인재 열람권 (1명)', amount: 33000, unlockDays: 90 },
  'talent-unlock-pack': { type: 'talent_search', name: '인재 열람권 (5명 팩)', amount: 132000, unlockDays: 90, unlockCount: 5 },
};

// 목 상세: 실제 이력서가 없어도 열람권만 있으면 그럴듯한 상세를 돌려준다(화면 확인용).
function mockDetailFor(talentId) {
  return {
    name: '홍길동(목)', phone: '010-1234-5678', email: 'candidate@example.com',
    specialty: '샘플 전문분야',
    detail: { introduction: '[로컬 목 데이터] 열람권 결제 후 공개되는 상세 이력서 예시입니다. 배포 환경에서는 실제 등록 이력서가 표시됩니다.' },
  };
}

async function handle(method, path, bodyText) {
  const body = (() => { try { return JSON.parse(bodyText || '{}'); } catch { return {}; } })();

  // 결제 주문 생성
  if (path === '/api/payment-orders' && method === 'POST') {
    const product = CATALOG[String(body.productId || '')];
    if (!product) return jsonRes({ error: '알 수 없는 상품입니다.' }, 400);
    const orderNumber = 'MOCK-' + Date.now().toString(36).toUpperCase();
    const orders = read(LS.orders, {});
    orders[orderNumber] = { orderNumber, productId: body.productId, amount: product.amount, status: 'pending', metadata: body.metadata || {}, createdAt: new Date().toISOString() };
    write(LS.orders, orders);
    return jsonRes({ order: { orderNumber, status: 'pending', totalAmount: product.amount }, inicis: { configured: false } });
  }

  // 결제 승인(가상) + 열람권 부여
  if (path === '/api/payment-approve' && method === 'POST') {
    const orders = read(LS.orders, {});
    const order = orders[body.orderNumber];
    if (!order) return jsonRes({ error: '주문을 찾을 수 없습니다.' }, 404);
    order.status = 'paid';
    orders[body.orderNumber] = order;
    write(LS.orders, orders);
    const product = CATALOG[order.productId];
    if (product?.type === 'talent_search') {
      const talentId = String(order.metadata?.talentId || '');
      if (talentId) {
        const unlocks = read(LS.unlocks, {});
        unlocks[talentId] = { talentId, orderNumber: order.orderNumber, at: new Date().toISOString() };
        write(LS.unlocks, unlocks);
      }
    }
    return jsonRes({ approved: true, status: 'paid', orderNumber: order.orderNumber, tid: 'MOCKTID', testMode: true, message: '[로컬 목] 가상 결제가 완료되었습니다(실제 청구 없음).' });
  }

  // 인재 상세: 부여된 열람권이 있으면 상세 공개
  if (path.startsWith('/api/talent-detail/') && method === 'GET') {
    const talentId = decodeURIComponent(path.slice('/api/talent-detail/'.length));
    const unlocks = read(LS.unlocks, {});
    if (unlocks[talentId]) return jsonRes({ unlocked: true, detail: mockDetailFor(talentId) });
    return jsonRes({ unlocked: false, detail: null });
  }

  // 이력서 저장
  if (path === '/api/resumes' && method === 'POST') {
    const id = 'RES-' + Date.now().toString(36).toUpperCase();
    const resumes = read(LS.resumes, {});
    resumes[id] = { id, ...body, createdAt: new Date().toISOString() };
    write(LS.resumes, resumes);
    return jsonRes({ id, saved: true }, 201);
  }
  if (path === '/api/resumes' && method === 'GET') {
    return jsonRes({ resumes: Object.values(read(LS.resumes, {})) });
  }

  // 목 계정(병원 회원으로 가정) — 화면 흐름 확인용
  if (path === '/api/account' && method === 'GET') {
    return jsonRes({ account: { role: 'hospital', name: '목 병원', email: 'hospital@example.com', organization: '목 병원 (로컬)' }, isAdmin: false });
  }

  // 그 외 GET은 빈 기본값으로 응답해 콘솔 404를 줄인다.
  if (method === 'GET') {
    if (path === '/api/saved-jobs') return jsonRes({ saved: [] });
    if (path === '/api/member-center') return jsonRes({ profile: {}, orders: [] });
    if (path === '/api/talent-access-audit') return jsonRes({ viewers: [], alerts: [], recent: [] });
    return jsonRes({ mock: true });
  }
  return jsonRes({ mock: true, ok: true });
}

export function installDevApiMock() {
  if (typeof window === 'undefined' || !window.fetch) return;
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = (init?.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase();
    // /api/* 요청만 가로챈다. 나머지(정적 파일 등)는 실제 fetch로.
    let pathname = '';
    try { pathname = new URL(url, window.location.origin).pathname; } catch { pathname = url; }
    if (!pathname.startsWith('/api/')) return realFetch(input, init);
    try {
      const bodyText = init?.body ? (typeof init.body === 'string' ? init.body : '') : '';
      const res = await handle(method, pathname, bodyText);
      // eslint-disable-next-line no-console
      console.info('[devApiMock]', method, pathname, '→', res.status);
      return res;
    } catch (e) {
      return jsonRes({ error: '목 처리 오류', detail: String(e) }, 500);
    }
  };
  // eslint-disable-next-line no-console
  console.info('%c[devApiMock] 로컬 가상 API 목 활성화 — /api/* 요청을 localStorage로 흉내냅니다. 배포 빌드에는 포함되지 않습니다.', 'color:#149e7f;font-weight:bold');
}
