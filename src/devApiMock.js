// 로컬 개발 전용 가상 API 목(mock).
// 배포 빌드에는 절대 포함되지 않는다 — client.jsx에서 import.meta.env.DEV일 때만 install() 호출.
// OpenAI Sites 서버(scripts/package-sites.mjs)가 로컬에 없어 /api/*가 404이므로,
// 결제→열람권→상세공개, 이력서 저장 등 서버 흐름을 localStorage로 흉내내 화면을 검증할 수 있게 한다.

const LS = {
  orders: 'devmock_orders',
  unlocks: 'devmock_talent_unlocks',
  resumes: 'devmock_resumes',
  authAccounts: 'devmock_auth_accounts', // { [email]: { role, password } }
  authSession: 'devmock_auth_session', // { email, role } | null
  adminContents: 'devmock_admin_contents', // 관리자가 올린 공고·콘텐츠 (로컬에서도 실제 저장·노출)
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
  'talent-unlock-single': { type: 'talent_search', name: '인재 열람권 (1명)', amount: 5000, unlockDays: 30 },
  'talent-unlock-pack': { type: 'talent_search', name: '인재 열람권 (5명 팩)', amount: 20000, unlockDays: 30, unlockCount: 5 },
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

  // 자체 로그인 목 — 서버 authApi(/api/auth/*) 계약과 동일한 형태로 반환.
  // 로컬에서 의사/병원 회원가입·로그인·로그아웃과 role 구분 흐름을 검증하기 위한 것.
  if (path === '/api/auth/logout' && method === 'POST') {
    write(LS.authSession, null);
    return jsonRes({ signedOut: true });
  }

  // 관리자 공고·콘텐츠 CRUD — 로컬에서도 실제 저장되어 목록·사이트에 노출되도록 localStorage에 반영.
  if (path === '/api/admin-console' && method === 'PATCH') {
    const { action, payload = {} } = body;
    const seed = [
      { id: 'c1', contentType: 'doctor_job', title: '소화기내과 전문의 추천채용', subtitle: '김해좋은내과병원', status: 'published', visibility: 'public', sortOrder: 100, payload: {}, createdBy: 'admin', updatedBy: 'admin', updatedAt: '2026-07-18 10:00' },
      { id: 'c2', contentType: 'medical_job', title: '병동 간호사 모집', subtitle: '서울○○병원', status: 'published', visibility: 'public', sortOrder: 0, payload: {}, createdBy: 'admin', updatedBy: 'admin', updatedAt: '2026-07-17 09:00' },
    ];
    const list = read(LS.adminContents, seed);
    const stamp = '2026-07-20 00:00';
    if (action === 'content_create') {
      const id = 'c-' + Math.random().toString(36).slice(2, 9);
      list.unshift({ ...payload, id, createdBy: 'admin', updatedBy: 'admin', updatedAt: stamp });
      write(LS.adminContents, list);
      return jsonRes({ ok: true, id });
    }
    if (action === 'content_update') {
      write(LS.adminContents, list.map((c) => c.id === payload.id ? { ...c, ...payload, updatedBy: 'admin', updatedAt: stamp } : c));
      return jsonRes({ ok: true });
    }
    if (action === 'content_delete') {
      write(LS.adminContents, list.filter((c) => c.id !== payload.id));
      return jsonRes({ ok: true });
    }
    return jsonRes({ ok: true });
  }
  if ((path === '/api/auth/login' || path === '/api/auth/register') && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(password)) {
      return jsonRes({ error: '이메일과 영문·숫자를 포함한 8자 이상의 비밀번호를 확인해주세요.' }, 400);
    }
    const accounts = read(LS.authAccounts, {});
    if (path === '/api/auth/register') {
      if (accounts[email]) return jsonRes({ error: '이미 가입된 이메일입니다.' }, 409);
      const role = body.role === 'hospital' ? 'hospital' : 'doctor';
      accounts[email] = { role, password };
      write(LS.authAccounts, accounts);
      write(LS.authSession, { email, role });
      return jsonRes({ signedIn: true, account: { role }, identity: { email } });
    }
    // login
    const acct = accounts[email];
    if (!acct || acct.password !== password) return jsonRes({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401);
    write(LS.authSession, { email, role: acct.role });
    return jsonRes({ signedIn: true, account: { role: acct.role }, identity: { email } });
  }

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
    if (unlocks[talentId]) {
      // 실제 이력서(resume-<id>)만 서버 상세를 흉내. 정적 데모(MH-...)는 detail:null로 반환해
      // 클라이언트가 data.js의 데모 상세로 폴백하게 한다(실제 서버 동작과 동일).
      const detail = talentId.startsWith('resume-') ? mockDetailFor(talentId) : null;
      return jsonRes({ unlocked: true, detail });
    }
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

  // 목 계정 — 서버 /api/account 계약과 동일한 형태로 반환.
  // 자체 로그인 목 세션(devmock_auth_session) 기준. 세션이 없으면 미로그인(로그인 폼 노출) 상태로 응답한다.
  // ※ 화면 흐름(병원 회원 결제·열람권 등)을 매번 로그인 없이 보고 싶으면 localStorage에
  //    devmock_auth_session = {"email":"hospital@example.com","role":"hospital"} 를 넣어두면 된다.
  if (path === '/api/account') {
    const raw = localStorage.getItem(LS.authSession);
    const session = raw && raw !== 'null' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;
    if (!session || !session.role) {
      return jsonRes({ signupEnabled: true, signedIn: false });
    }
    const role = session.role === 'doctor' ? 'doctor' : 'hospital';
    const email = session.email || (role === 'hospital' ? 'hospital@example.com' : 'doctor@example.com');
    const isHospital = role === 'hospital';
    const identity = { email, displayName: isHospital ? '목 병원 담당자' : '목 의사 회원' };
    const account = { role, createdAt: '2026-01-01T00:00:00.000Z' };
    const profile = isHospital
      ? { displayName: '목 병원 담당자', phone: '010-1111-2222', organization: '목 병원 (로컬)', jobTitle: '채용담당' }
      : { displayName: '목 의사 회원', phone: '010-3333-4444', specialty: '내과' };
    return jsonRes({ signupEnabled: true, signedIn: true, account, identity, isAdmin: false, profile, email });
  }

  // 마이페이지 환불(청약철회) 요청 목: 주문 상태를 refund_requested로 표시.
  if (path === '/api/member-center' && method === 'POST' && body.action === 'refund_request') {
    const orders = read(LS.orders, {});
    if (!String(body.reason || '').trim()) return jsonRes({ error: '환불 사유를 입력해주세요.' }, 400);
    const target = Object.values(orders).find((o) => o.orderNumber === body.orderNumber);
    if (!target) return jsonRes({ error: '본인 결제 내역에서 환불할 건을 찾을 수 없습니다.' }, 404);
    if (!['paid', 'partially_refunded'].includes(target.status)) return jsonRes({ error: '환불할 수 없는 상태입니다.' }, 400);
    if (target.refundRequested) return jsonRes({ error: '이미 접수된 환불 요청이 처리 중입니다.' }, 409);
    target.refundRequested = { reason: body.reason || '', at: new Date().toISOString() };
    orders[target.orderNumber] = target;
    write(LS.orders, orders);
    return jsonRes({ requested: true, orderNumber: target.orderNumber });
  }

  // 그 외 GET은 빈 기본값으로 응답해 콘솔 404를 줄인다.
  if (method === 'GET') {
    if (path === '/api/saved-jobs') return jsonRes({ saved: [] });
    if (path === '/api/member-center') {
      // 저장된 주문을 서버(member-center)와 같은 형태로 내려 결제 이력에 열람권이 뜨게 한다.
      const orders = Object.values(read(LS.orders, {})).map((o) => {
        const p = CATALOG[o.productId] || {};
        return { orderNumber: o.orderNumber, productType: p.type || '', productName: p.name || o.productId, totalAmount: o.amount, status: o.status, paymentMethod: 'card', paidAt: o.createdAt, createdAt: o.createdAt, exposure: null };
      }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return jsonRes({ signedIn: true, account: { role: 'hospital' }, orders });
    }
    if (path === '/api/talent-access-audit') return jsonRes({ viewers: [], alerts: [], recent: [] });
    if (path === '/api/site-operations') {
      // 공개 사이트가 읽는 운영 데이터. 관리자가 올린 '공개' 공고를 contents로 노출해
      // 로컬에서도 /jobs·/medical-staff 목록에 실제로 뜨게 한다(배포 서버 동작과 동일).
      const adminContents = read(LS.adminContents, []);
      const publicContents = adminContents.filter((c) => c.status === 'published' && (c.visibility || 'public') === 'public');
      return jsonRes({
        settings: { siteName: '메디헬퍼스', supportPhone: '051-342-5463', supportEmail: 'hr@medihelpers.co.kr', announcement: '' },
        features: { doctorRecruitment: true, talentSearch: true, resumeRegistration: true, medicalStaffHub: true, paidCareerService: false, adRegistration: true },
        contents: publicContents,
      });
    }
    if (path === '/api/admin-console') {
      // 관리자 콘솔 대시보드/콘텐츠 관리 화면 확인용 목 데이터.
      const contents = read(LS.adminContents, [
        { id: 'c1', contentType: 'doctor_job', title: '소화기내과 전문의 추천채용', subtitle: '김해좋은내과병원', status: 'published', visibility: 'public', sortOrder: 100, payload: {}, createdBy: 'admin', updatedBy: 'admin', updatedAt: '2026-07-18 10:00' },
        { id: 'c2', contentType: 'medical_job', title: '병동 간호사 모집', subtitle: '서울○○병원', status: 'published', visibility: 'public', sortOrder: 0, payload: {}, createdBy: 'admin', updatedBy: 'admin', updatedAt: '2026-07-17 09:00' },
      ]);
      return jsonRes({
        metrics: { accounts: 128, doctors: 83, hospitals: 45, consultations: 17, activeCases: 8, hiredCases: 2, categories: 16, contents: contents.length, auditLogs: 41, payments: 3, pendingPayments: 1, paidRevenue: 448000, refundedPayments: 0 },
        contents, categories: [], features: {}, settings: {}, audit: [], consultations: [], cases: [], members: [], payments: [], transactions: [], refunds: [], resumes: [],
      });
    }
    return jsonRes({ mock: true });
  }
  return jsonRes({ mock: true, ok: true });
}

export function installDevApiMock() {
  if (typeof window === 'undefined' || !window.fetch) return;
  // 첫 방문(세션 키 자체가 없음)에는 병원 회원으로 자동 로그인해 기존 화면 흐름을 바로 볼 수 있게 시드한다.
  // 로그아웃하면 'null'이 저장되어(키는 존재) 로그인 폼이 노출되고, 이 시드는 다시 덮어쓰지 않는다.
  try {
    if (localStorage.getItem(LS.authSession) === null) {
      write(LS.authSession, { email: 'hospital@example.com', role: 'hospital' });
    }
  } catch {}
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
