// 로컬 개발 전용 가상 API 목(mock).
// 배포 빌드에는 절대 포함되지 않는다 — client.jsx에서 import.meta.env.DEV일 때만 install() 호출.
// OpenAI Sites 서버(scripts/package-sites.mjs)가 로컬에 없어 /api/*가 404이므로,
// 결제→열람권→상세공개, 이력서 저장 등 서버 흐름을 localStorage로 흉내내 화면을 검증할 수 있게 한다.

const LS = {
  orders: 'devmock_orders',
  unlocks: 'devmock_talent_unlocks',
  creditPool: 'devmock_talent_credits', // 팩 열람권 크레딧 { total, used }
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
  // 의사 멤버십은 폐지됨. 유료 상품은 병원 광고 + 병원 인재 열람권뿐.
  'talent-unlock-single': { type: 'talent_search', name: '인재 열람권 (1명)', amount: 3900, unlockDays: 30, unlockCount: 1 },
  'talent-unlock-pack': { type: 'talent_search', name: '인재 열람권 (10명 팩)', amount: 29000, unlockDays: 30, unlockCount: 10 },
  'talent-unlock-pack30': { type: 'talent_search', name: '인재 열람권 (30명 팩)', amount: 69000, unlockDays: 30, unlockCount: 30 },
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
      const count = Math.max(1, Number(product.unlockCount) || 1);
      if (count > 1) {
        // 팩: 크레딧 적립(새 인재를 열 때마다 1개 소모).
        const pool = read(LS.creditPool, { total: 0, used: 0 });
        pool.total = Number(pool.total || 0) + count;
        write(LS.creditPool, pool);
      } else {
        const talentId = String(order.metadata?.talentId || '');
        if (talentId) {
          const unlocks = read(LS.unlocks, {});
          unlocks[talentId] = { talentId, orderNumber: order.orderNumber, at: new Date().toISOString() };
          write(LS.unlocks, unlocks);
        }
      }
    }
    return jsonRes({ approved: true, status: 'paid', orderNumber: order.orderNumber, tid: 'MOCKTID', testMode: true, message: '[로컬 목] 가상 결제가 완료되었습니다(실제 청구 없음).' });
  }

  // 인재 상세: 부여된 열람권이 있으면 상세 공개
  if (path.startsWith('/api/talent-detail/') && method === 'GET') {
    const talentId = decodeURIComponent(path.slice('/api/talent-detail/'.length));
    const unlocks = read(LS.unlocks, {});
    // 직접 열람권이 없으면 팩 크레딧으로 새로 연다(1개 소모).
    if (!unlocks[talentId]) {
      const pool = read(LS.creditPool, { total: 0, used: 0 });
      if (Number(pool.used || 0) < Number(pool.total || 0)) {
        pool.used = Number(pool.used || 0) + 1;
        write(LS.creditPool, pool);
        unlocks[talentId] = { talentId, source: 'pack', at: new Date().toISOString() };
        write(LS.unlocks, unlocks);
      }
    }
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
    // 로컬에서도 관리자 테스트 계정은 관리자로 인식(admin@medihelpers.co.kr).
    const isAdmin = String(email).toLowerCase() === 'admin@medihelpers.co.kr';
    return jsonRes({ signupEnabled: true, signedIn: true, account, identity, isAdmin, profile, email });
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
      // 세션의 실제 역할·관리자 여부를 반영(마이페이지가 관리자를 콘솔로 안내하도록).
      const sess = read(LS.authSession, null) || {};
      const role = sess.role === 'doctor' ? 'doctor' : 'hospital';
      const isAdmin = String(sess.email || '').toLowerCase() === 'admin@medihelpers.co.kr';
      return jsonRes({ signedIn: true, isAdmin, account: { role }, identity: { email: sess.email || '' }, orders });
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
        // 병원이 유료 광고를 결제하면 생기는 '검수 대기' 공고. 승인/반려 버튼이 이 조건에서만
        // 렌더되므로, 목 데이터에 반드시 남겨둔다(예전에 이게 없어서 관리자 콘솔 크래시를 놓쳤다).
        { id: 'ad-order-mock1', contentType: 'doctor_job', title: '정형외과 전문의 초빙(유료광고)', subtitle: '해운대바른척추병원', status: 'draft', visibility: 'public', sortOrder: 0, payload: { fromHospital: true, adProductName: '추천 공고', department: '정형외과', region: '부산' }, createdBy: 'hr@hospital.co.kr', updatedBy: 'hr@hospital.co.kr', updatedAt: '2026-07-26 09:00' },
      ]);
      // 목 데이터는 '비어 있지 않게' 유지한다. 빈 배열이면 상세·승인·환불 등 조건부 UI가
      // 로컬에서 아예 렌더되지 않아 배포본에서만 터지는 크래시를 놓친다.
      const mockConsultations = [
        { id: 'con-mock-1', requestType: 'hospital', requesterName: '박정호', phone: '010-9876-5432', email: 'hr@hospital.co.kr', specialty: '정형외과', status: 'new', adminNote: '', emailNotificationStatus: 'sent', smsNotificationStatus: 'sent', createdAt: '2026-07-26 09:10', updatedAt: '2026-07-26 09:10', payload: { hospital: '해운대바른척추병원', purpose: '의사 추천', message: '정형외과 전문의 채용 상담 요청' } },
        { id: 'con-mock-2', requestType: 'doctor', requesterName: '김현우', phone: '010-1234-5678', email: 'doctor@example.com', specialty: '소화기내과', status: 'in_progress', adminNote: '희망 조건 확인 중', emailNotificationStatus: 'sent', smsNotificationStatus: 'skipped', createdAt: '2026-07-25 13:20', updatedAt: '2026-07-25 14:05', payload: { region: '부산·경남', workType: '외래 중심', message: '비공개 이직 상담' } },
      ];
      const mockCases = [
        { id: 'CASE-mock-1', consultationId: 'con-mock-1', hospitalName: '해운대바른척추병원', specialty: '정형외과', positionTitle: '정형외과 전문의', stage: 'candidate_search', assignedRecruiter: '김혜원 헤드헌터', estimatedFee: 18000000, nextAction: '후보 2명 의사 확인', billingStatus: 'success_fee', candidateCount: 2, createdAt: '2026-07-26 09:20', updatedAt: '2026-07-26 09:40' },
      ];
      const mockPayments = [
        { id: 'o-mock-1', orderNumber: 'MH-20260726-MOCK0001', accountId: 'm2', accountRole: 'hospital', productType: 'doctor_ad', productName: '추천 공고', totalAmount: 149000, supplyAmount: 135455, taxAmount: 13545, status: 'paid', paymentMethod: 'card', customerName: '박정호', customerEmail: 'hr@hospital.co.kr', customerPhone: '010-9876-5432', createdAt: '2026-07-26 09:00', paidAt: '2026-07-26 09:05', adminNote: '', exposure: { start: '2026-07-26', end: '2026-08-25', days: 30 } },
        { id: 'o-mock-2', orderNumber: 'MH-20260725-MOCK0002', accountId: 'm2', accountRole: 'hospital', productType: 'talent_search', productName: '인재 열람권 (10명 팩)', totalAmount: 29000, supplyAmount: 26364, taxAmount: 2636, status: 'awaiting_payment', paymentMethod: 'card', customerName: '박정호', customerEmail: 'hr@hospital.co.kr', customerPhone: '010-9876-5432', createdAt: '2026-07-25 10:05', adminNote: '' },
      ];
      const mockMembers = [
        { id: 'm1', role: 'doctor', email: 'doctor@example.com', fullName: '김현우', status: 'active', verificationStatus: 'verified', phone: '010-1234-5678', organization: '', jobTitle: '정형외과 전문의', consentCount: 3, orderCount: 0, lifetimeValue: 0, createdAt: '2026-07-16 09:30', lastLoginAt: '2026-07-26 08:40' },
        { id: 'm2', role: 'hospital', email: 'hr@hospital.co.kr', fullName: '박정호', status: 'active', verificationStatus: 'pending', phone: '010-9876-5432', organization: '해운대바른척추병원', jobTitle: '채용팀장', consentCount: 3, orderCount: 2, lifetimeValue: 178000, createdAt: '2026-07-15 11:20', lastLoginAt: '2026-07-26 09:00' },
      ];
      return jsonRes({
        metrics: { accounts: mockMembers.length, doctors: 1, hospitals: 1, consultations: mockConsultations.length, activeCases: 1, hiredCases: 0, categories: 16, contents: contents.length, auditLogs: 2, payments: mockPayments.length, pendingPayments: 1, paidRevenue: 149000, refundedPayments: 0 },
        contents, categories: [], features: {}, settings: {},
        audit: [
          { id: 'a1', subject: '의사 초빙공고', action: '기능 공개 설정', actor: 'admin@medihelpers.co.kr', createdAt: '2026-07-26 09:20' },
        ],
        consultations: mockConsultations, cases: mockCases, members: mockMembers,
        payments: mockPayments,
        transactions: [{ id: 't-mock-1', orderId: 'o-mock-1', transactionType: 'capture', provider: 'manual', providerTransactionId: 'mock-tx-001', amount: 149000, status: 'succeeded', processedAt: '2026-07-26 09:05' }],
        refunds: [],
        resumes: [{ id: 'r-mock-1', profession: '의사', specialty: '소화기내과', visibility: 'public', completion: 80, updatedAt: '2026-07-25 12:00' }],
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
    // 이미지 업로드 목: 실제 R2가 없으므로 업로드한 파일을 data URL로 변환해 돌려준다.
    // 배포 서버는 /api/uploads/<key>를 돌려주지만, 로컬에선 data URL이 미리보기·저장에 그대로 쓰인다.
    if (pathname === '/api/uploads' && method === 'POST') {
      try {
        const raw = init?.body;
        const blob = raw instanceof Blob ? raw : new Blob([raw || '']);
        const contentType = (typeof input !== 'string' && input?.headers?.get?.('content-type')) || init?.headers?.['content-type'] || init?.headers?.['Content-Type'] || blob.type || 'image/png';
        if (blob.size > 5 * 1024 * 1024) return jsonRes({ error: '이미지는 5MB 이하만 업로드할 수 있습니다.' }, 413);
        const dataUrl = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result));
          fr.onerror = () => reject(new Error('read fail'));
          fr.readAsDataURL(blob);
        });
        const purpose = (init?.headers?.['x-upload-purpose']) || 'photo';
        // eslint-disable-next-line no-console
        console.info('[devApiMock] POST /api/uploads →', contentType, blob.size, 'bytes (data URL 반환)');
        return jsonRes({ uploaded: true, url: dataUrl, key: 'mock/' + Date.now(), purpose }, 201);
      } catch (e) {
        return jsonRes({ error: '목 업로드 실패', detail: String(e) }, 500);
      }
    }
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
