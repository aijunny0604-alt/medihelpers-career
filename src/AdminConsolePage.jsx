import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, BriefcaseBusiness, Building2, ChevronRight, CreditCard, Database,
  Eye, FileText, FolderKanban, LayoutDashboard, PencilLine, Plus, ReceiptText, RotateCcw, Save, Search, Settings,
  ShieldAlert, ShieldCheck, SlidersHorizontal, Trash2, UserRoundCog, UsersRound, X
} from 'lucide-react';
import { jobs, talent } from './data.js';
import { sampleJobs as medicalStaffJobs } from './MedicalStaffPage.jsx';
import { ReceiptModal } from './MemberCenterPage.jsx';

const catalogContents = [
  ...jobs.map((job) => ({
    id:`catalog-doctor-${job.id}`,
    contentType:'doctor_job',
    title:job.title,
    subtitle:job.hospital,
    status:'published',
    visibility:'doctor',
    updatedAt:job.deadline || '',
    source:'catalog',
    payload:{
      primary:job.location || job.region || '',
      secondary:job.pay || '',
      department:job.dept || '',
      region:job.region || job.location || '',
      employmentType:job.type || '',
      deadline:job.deadline || '',
      schedule:job.schedule || job.workHours || '',
      description:job.summary || '',
    },
  })),
  ...medicalStaffJobs.map((job) => ({
    id:`catalog-medical-${job.id}`,
    contentType:'medical_job',
    title:job.title,
    subtitle:job.hospital,
    status:'published',
    visibility:'public',
    updatedAt:job.deadline || '',
    source:'catalog',
    payload:{
      primary:job.region || '',
      secondary:job.pay || '',
      role:job.role || '',
      region:job.region || '',
      employmentType:job.type || '',
      career:job.career || '',
      deadline:job.deadline || '',
    },
  })),
  ...talent.map((person) => ({
    id:`catalog-talent-${person.code}`,
    contentType:'talent_profile',
    title:`${person.dept} · ${person.career}`,
    subtitle:person.name,
    status:'published',
    visibility:'hospital',
    updatedAt:'',
    source:'catalog',
    payload:{
      primary:person.region || '',
      secondary:person.preference || '',
      department:person.dept || '',
      career:person.career || '',
      description:`입사 가능 ${person.available || '협의'}`,
    },
  })),
];

const mergeContentInventory = (contents = []) => [
  ...contents.map((item) => ({ ...item, source:item.source || 'database' })),
  ...catalogContents,
];

const groups = [
  { title: '운영 대시보드', items: [
    ['dashboard', '전체 현황', LayoutDashboard],
    ['monitoring', '통합 모니터링', Activity],
    ['crm', '채용 CRM', BriefcaseBusiness],
    ['consultations', '상담 접수', UsersRound],
  ] },
  { title: '사이트 관리', items: [
    ['contents', '공고 · 인재 · 게시글', PencilLine],
    ['categories', '카테고리 관리', FolderKanban],
    ['settings', '사이트 기본정보', FileText],
    ['features', '기능 설정', SlidersHorizontal],
  ] },
  { title: '회원 · 데이터', items: [
    ['members', '회원 현황', UserRoundCog],
    ['resumes', '이력서 관리', FileText],
    ['payments', '결제 · 환불 관리', CreditCard],
    ['talentAudit', '인재 열람 감사', ShieldAlert],
    ['database', 'DB 현황', Database],
    ['audit', '변경 이력', Activity],
  ] },
];

const demoCategorySeed = {
  doctor_specialty: ['내과','외과','정형외과','신경외과','소아청소년과','산부인과','가정의학과','영상의학과','마취통증의학과','정신건강의학과','피부과','성형외과','안과','이비인후과','비뇨의학과','재활의학과','응급의학과','신경과','진단검사의학과','병리과','심장혈관흉부외과','직업환경의학과','핵의학과','예방의학과'],
  region: ['서울','경기','인천','부산','대구','대전','광주','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주'],
  medical_role: ['간호사','간호조무사','방사선사','임상병리사','물리치료사','작업치료사','치과위생사','약사','응급구조사','보건의료정보관리사','안경사','병원행정'],
};
const demoCategories = Object.entries(demoCategorySeed).flatMap(([groupKey, names]) => names.map((name, index) => ({ id:`${groupKey}-${index + 1}`, groupKey, name, slug:`${groupKey}-${index + 1}`, sortOrder:(index + 1) * 10, enabled:true })));

const demoData = {
  metrics: { accounts: 128, doctors: 83, hospitals: 45, consultations: 17, activeCases: 8, hiredCases: 2, categories: 16, contents: catalogContents.length, auditLogs: 41, payments: 3, pendingPayments: 1, paidRevenue: 448000, refundedPayments: 0 },
  settings: {
    siteName: '메디헬퍼스',
    supportPhone: '051-342-5463',
    supportEmail: 'hr@medihelpers.co.kr',
    announcement: '의사 채용·이직 전문 헤드헌팅',
    maintenanceMode: false,
  },
  features: {
    doctorRecruitment: true,
    talentSearch: true,
    resumeRegistration: true,
    medicalStaffHub: false,
    paidCareerService: false,
    adRegistration: true,
  },
  categories: demoCategories,
  contents: catalogContents,
  members: [
    { id:'m1', role:'doctor', email:'doctor@example.com', fullName:'김현우', status:'active', verificationStatus:'verified', phone:'010-1234-5678', organization:'', jobTitle:'정형외과 전문의', consentCount:3, orderCount:1, lifetimeValue:39000, createdAt:'2026-07-16 09:30', lastLoginAt:'2026-07-17 15:40' },
    { id:'m2', role:'hospital', email:'hr@samplehospital.co.kr', fullName:'박지은', status:'active', verificationStatus:'pending', phone:'010-9876-5432', organization:'샘플메디컬센터', jobTitle:'채용팀장', consentCount:3, orderCount:2, lifetimeValue:409000, createdAt:'2026-07-15 11:20', lastLoginAt:'2026-07-17 14:15' },
  ],
  payments: [
    { id:'o1', orderNumber:'MH-20260717-A1B2C3D4', accountId:'m2', accountRole:'hospital', productType:'doctor_ad', productName:'집중 채용', totalAmount:299000, supplyAmount:271818, taxAmount:27182, status:'awaiting_payment', paymentMethod:'card', customerName:'박지은', customerEmail:'hr@samplehospital.co.kr', customerPhone:'010-9876-5432', createdAt:'2026-07-17 14:30', adminNote:'' },
    { id:'o2', orderNumber:'MH-20260716-E5F6G7H8', accountId:'m1', accountRole:'doctor', productType:'membership', productName:'커리어 컨시어지', totalAmount:39000, supplyAmount:35455, taxAmount:3545, status:'paid', paymentMethod:'card', customerName:'김현우', customerEmail:'doctor@example.com', customerPhone:'010-1234-5678', createdAt:'2026-07-16 10:05', paidAt:'2026-07-16 10:08', adminNote:'카드 승인 확인' },
  ],
  transactions: [
    { id:'t1', orderId:'o2', transactionType:'capture', provider:'manual', providerTransactionId:'demo-tx-001', amount:39000, status:'succeeded', processedAt:'2026-07-16 10:08' },
  ],
  refunds: [],
  audit: [
    { id: 'a1', subject: '의사 초빙공고', action: '기능 공개 설정', actor: 'admin@medihelpers.co.kr', createdAt: '2026-07-17 14:20' },
    { id: 'a2', subject: '진료과 카테고리', action: '정형외과 순서 변경', actor: 'admin@medihelpers.co.kr', createdAt: '2026-07-17 13:44' },
  ],
  consultations: [
    { id:'con-demo-1', requestType:'hospital', requesterName:'박정호', phone:'010-9876-5432', email:'hr@samplehospital.co.kr', specialty:'정형외과', status:'new', adminNote:'', emailNotificationStatus:'sent', smsNotificationStatus:'sent', createdAt:'2026-07-17 15:10', updatedAt:'2026-07-17 15:10', payload:{ hospital:'샘플메디컬센터', purpose:'의사 추천', message:'정형외과 전문의 채용 상담 요청' } },
    { id:'con-demo-2', requestType:'doctor', requesterName:'김현우', phone:'010-1234-5678', email:'doctor@example.com', specialty:'소화기내과', status:'in_progress', adminNote:'희망 조건 확인 중', emailNotificationStatus:'sent', smsNotificationStatus:'skipped', createdAt:'2026-07-17 13:20', updatedAt:'2026-07-17 14:05', payload:{ region:'부산·경남', workType:'외래 중심', message:'비공개 이직 상담' } },
  ],
  cases: [
    { id:'case-demo-1', consultationId:'con-demo-1', hospitalName:'샘플메디컬센터', specialty:'정형외과', positionTitle:'정형외과 전문의', stage:'candidate_search', assignedRecruiter:'김혜원 헤드헌터', estimatedFee:18000000, nextAction:'후보 2명 의사 확인', billingStatus:'success_fee', candidateCount:2, createdAt:'2026-07-17 15:20', updatedAt:'2026-07-17 15:40' },
  ],
};

const categoryLabels = {
  doctor_specialty: '의사 진료과',
  region: '근무 지역',
  medical_role: '의료인 직군',
};

const featureLabels = {
  doctorRecruitment: ['의사 초빙정보', '의사 채용공고 목록과 상세 페이지'],
  talentSearch: ['인재정보', '병원 회원의 익명 인재 검색'],
  resumeRegistration: ['이력서 등록', '일반 회원 중 의료인 이력서 작성 및 관리'],
  medicalStaffHub: ['의료인 채용 허브', '간호·보건 직군 확장 영역'],
  paidCareerService: ['프리미엄 커리어 서비스', '유료 조건 비교·계약 분석'],
  adRegistration: ['병원 광고 등록', '공고 상품 신청과 검수'],
};

const go = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

async function loadConsole() {
  const response = await fetch('/api/admin-console', { credentials: 'same-origin' });
  if (!response.ok) throw new Error(response.status === 403 ? '관리자 권한이 필요합니다.' : '관리자 데이터를 불러오지 못했습니다.');
  return response.json();
}

async function updateConsole(action, payload) {
  const response = await fetch('/api/admin-console', {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || '변경사항을 저장하지 못했습니다.');
  return body;
}

export default function AdminConsolePage({ qa = false }) {
  const [section, setSection] = useState('dashboard');
  const [data, setData] = useState(demoData);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(!qa);

  const refresh = async () => {
    if (qa) return;
    setLoading(true);
    try {
      const next = await loadConsole();
      const contents = mergeContentInventory(next.contents);
      setData({ ...next, contents, metrics:{ ...next.metrics, contents:contents.length, databaseContents:(next.contents || []).length } });
      setMessage('');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [qa]);

  const mutate = async (action, payload, success) => {
    if (qa) {
      setMessage(`QA 미리보기: ${success}`);
      return null;
    }
    try {
      await updateConsole(action, payload);
      setMessage(success);
      await refresh();
      return true;
    } catch (error) {
      setMessage(error.message);
      return false;
    }
  };

  const currentLabel = useMemo(
    () => groups.flatMap((group) => group.items).find(([key]) => key === section)?.[1] || '관리자 모드',
    [section]
  );

  const select = (key) => {
    if (key === 'crm') return go('/admin/recruitment-crm');
    if (key === 'consultations') return go('/admin/consultations');
    setSection(key);
  };

  return (
    <div className="admin-console">
      <div className="admin-console-top">
        <div>
          <span className="admin-console-mark"><ShieldCheck /></span>
          <div><strong>메디헬퍼스 관리자 모드</strong><small>운영 · 회원 · 콘텐츠 통합 관리</small></div>
        </div>
        <nav>
          <button onClick={() => go('/admin/recruitment-crm')}>채용 CRM</button>
          <button onClick={() => go('/admin/consultations')}>상담함</button>
          <button onClick={() => go('/')}>사이트 보기</button>
        </nav>
      </div>
      <div className="admin-console-shell">
        <aside className="admin-sidebar">
          <div className="admin-profile">
            <span><UserRoundCog /></span>
            <div><strong>최고 관리자</strong><small>{qa ? 'QA 권한 미리보기' : '인증된 운영 계정'}</small></div>
          </div>
          {groups.map((group) => (
            <section key={group.title}>
              <h2>{group.title}</h2>
              {group.items.map(([key, label, Icon]) => (
                <button className={section === key ? 'active' : ''} key={key} onClick={() => select(key)}>
                  <Icon /><span>{label}</span><ChevronRight />
                </button>
              ))}
            </section>
          ))}
          <div className="admin-security-note"><ShieldCheck /><p><strong>안전한 운영 원칙</strong><br />직접 SQL 대신 검증된 관리 기능과 변경 이력을 사용합니다.</p></div>
        </aside>
        <main className="admin-workspace">
          <header className="admin-page-head">
            <div><small>ADMINISTRATION CONSOLE</small><h1>{currentLabel}</h1><p>홈페이지의 운영 데이터와 공개 기능을 한곳에서 관리합니다.</p></div>
            <span className={loading ? 'loading' : ''}>{loading ? '데이터 동기화 중' : '운영 DB 연결'}</span>
          </header>
          {message && <div className="admin-message">{message}</div>}
          {section === 'dashboard' && <Dashboard data={data} select={select} />}
          {section === 'monitoring' && <OperationsMonitor data={data} select={select} />}
          {section === 'contents' && <ContentManager data={data} setData={setData} mutate={mutate} qa={qa} />}
          {section === 'categories' && <Categories data={data} setData={setData} mutate={mutate} qa={qa} />}
          {section === 'settings' && <SiteSettings data={data} setData={setData} mutate={mutate} />}
          {section === 'features' && <Features data={data} setData={setData} mutate={mutate} />}
          {section === 'members' && <Members data={data} mutate={mutate} />}
          {section === 'resumes' && <Resumes data={data} />}
          {section === 'payments' && <Payments data={data} mutate={mutate} />}
          {section === 'talentAudit' && <TalentAccessAudit active={section === 'talentAudit'} />}
          {section === 'database' && <DatabaseStatus metrics={data.metrics} />}
          {section === 'audit' && <Audit audit={data.audit} />}
        </main>
      </div>
    </div>
  );
}

function Dashboard({ data, select }) {
  const cards = [
    ['전체 회원', data.metrics.accounts, UserRoundCog, `의사 ${data.metrics.doctors} · 병원 ${data.metrics.hospitals}`],
    ['결제 요청', data.metrics.payments || 0, CreditCard, `처리 대기 ${data.metrics.pendingPayments || 0}건`],
    ['누적 결제', `${(data.metrics.paidRevenue || 0).toLocaleString()}원`, ReceiptText, `환불 주문 ${data.metrics.refundedPayments || 0}건`],
    ['상담 접수', data.metrics.consultations, UsersRound, '신규·처리 대기 포함'],
    ['진행 채용', data.metrics.activeCases, BriefcaseBusiness, `입사 확정 ${data.metrics.hiredCases}건`],
    ['운영 콘텐츠', data.metrics.contents || 0, PencilLine, '공고·인재·게시글'],
  ];
  return <>
    <div className="admin-metric-grid">{cards.map(([label, value, Icon, copy]) => <article key={label}><span><Icon /></span><div><small>{label}</small><strong>{value.toLocaleString()}</strong><p>{copy}</p></div></article>)}</div>
    <div className="admin-dashboard-grid">
      <section className="admin-panel">
        <header><div><small>QUICK MANAGEMENT</small><h2>빠른 관리</h2></div></header>
        <div className="admin-quick-grid">
          <button onClick={() => select('monitoring')}><Activity /><span><strong>통합 모니터링</strong><small>공고·상담·채용·결제 상태</small></span><ChevronRight /></button>
          <button onClick={() => select('contents')}><PencilLine /><span><strong>콘텐츠 통합 관리</strong><small>공고·인재·게시글 CRUD</small></span><ChevronRight /></button>
          <button onClick={() => select('payments')}><CreditCard /><span><strong>결제 · 환불 관리</strong><small>주문·승인·영수증·환불</small></span><ChevronRight /></button>
          <button onClick={() => select('categories')}><FolderKanban /><span><strong>카테고리 관리</strong><small>진료과·지역·직군</small></span><ChevronRight /></button>
          <button onClick={() => select('features')}><SlidersHorizontal /><span><strong>기능 설정</strong><small>서비스 공개 여부</small></span><ChevronRight /></button>
          <button onClick={() => select('crm')}><BriefcaseBusiness /><span><strong>채용 CRM</strong><small>후보·면접·입사</small></span><ChevronRight /></button>
          <button onClick={() => select('audit')}><Activity /><span><strong>변경 이력</strong><small>관리자 감사 로그</small></span><ChevronRight /></button>
        </div>
      </section>
      <section className="admin-panel">
        <header><div><small>OPERATIONS</small><h2>오늘 확인할 항목</h2></div></header>
        <div className="admin-todo">
          <button onClick={() => select('consultations')}><span>상담 접수</span><strong>{data.metrics.consultations}건</strong><ChevronRight /></button>
          <button onClick={() => select('crm')}><span>진행 중 채용</span><strong>{data.metrics.activeCases}건</strong><ChevronRight /></button>
          <button onClick={() => select('audit')}><span>관리 변경 기록</span><strong>{data.metrics.auditLogs}건</strong><ChevronRight /></button>
        </div>
      </section>
    </div>
  </>;
}

const monitorLabels = {
  consultation: '상담·문의',
  case: '채용 진행',
  content: '공고·콘텐츠',
  payment: '결제·환불',
};

const consultationStatus = { new:'신규 접수', contacted:'연락 완료', in_progress:'처리 중', closed:'종료' };
const caseStatus = { new_request:'신규 의뢰', condition_review:'조건 확인', candidate_search:'후보 탐색', candidate_consent:'후보 동의', hospital_submitted:'병원 제안', interview:'면접 예정', negotiation:'조건 협상', hired:'입사 확정', closed:'종료' };
const contentStatus = { draft:'임시저장', published:'공개 중', hidden:'숨김', closed:'마감' };
const paymentStatus = { pending_review:'검토 대기', awaiting_payment:'결제 대기', paid:'결제 완료', failed:'결제 실패', cancelled:'취소', partially_refunded:'부분 환불', refunded:'환불 완료' };

function OperationsMonitor({ data, select }) {
  const [kind, setKind] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState(null);
  const records = useMemo(() => [
    ...(data.consultations || []).map((item) => ({ ...item, monitorType:'consultation', monitorTitle:`${item.requesterName || '이름 미입력'} ${item.requestType === 'hospital' ? '병원 채용 문의' : '의사 이직 상담'}`, monitorSubtitle:item.specialty || item.email || '상담 내용 확인', monitorStatus:consultationStatus[item.status] || item.status, monitorDate:item.updatedAt || item.createdAt })),
    ...(data.cases || []).map((item) => ({ ...item, monitorType:'case', monitorTitle:item.hospitalName || item.positionTitle || '채용 건', monitorSubtitle:`${item.specialty || '진료과 미정'} · ${item.assignedRecruiter || '담당자 미배정'}`, monitorStatus:caseStatus[item.stage] || item.stage, monitorDate:item.updatedAt || item.createdAt })),
    ...(data.contents || []).map((item) => ({ ...item, monitorType:'content', monitorTitle:item.title, monitorSubtitle:item.subtitle || contentTypeLabels[item.contentType] || '운영 콘텐츠', monitorStatus:contentStatus[item.status] || item.status, monitorDate:item.updatedAt || item.createdAt })),
    ...(data.payments || []).map((item) => ({ ...item, monitorType:'payment', monitorTitle:item.productName || item.orderNumber || '결제 주문', monitorSubtitle:`${item.customerName || '회원'} · ${(Number(item.totalAmount) || 0).toLocaleString()}원`, monitorStatus:paymentStatus[item.status] || item.status, monitorDate:item.updatedAt || item.createdAt })),
  ].sort((a, b) => String(b.monitorDate || '').localeCompare(String(a.monitorDate || ''))), [data]);
  const counts = Object.fromEntries(Object.keys(monitorLabels).map((key) => [key, records.filter((item) => item.monitorType === key).length]));
  const visible = records.filter((item) => {
    if (kind !== 'all' && item.monitorType !== kind) return false;
    if (!keyword.trim()) return true;
    const haystack = `${item.monitorTitle} ${item.monitorSubtitle} ${item.monitorStatus} ${item.id}`.toLowerCase();
    return haystack.includes(keyword.trim().toLowerCase());
  });
  const openManager = (item) => {
    setSelected(null);
    if (item.monitorType === 'consultation') return go('/admin/consultations');
    if (item.monitorType === 'case') return go('/admin/recruitment-crm');
    if (item.monitorType === 'content') return select('contents');
    return select('payments');
  };
  return <section className="admin-panel admin-monitor">
    <header><div><small>REAL-TIME OPERATIONS MONITOR</small><h2>공고·상담·채용·결제 통합 모니터링</h2><p>새로 접수되거나 상태가 바뀐 운영 데이터를 시간순으로 확인하고 담당 관리 화면으로 바로 이동합니다.</p></div><button className="admin-primary" onClick={() => window.location.reload()}><RotateCcw />새로고침</button></header>
    <div className="admin-monitor-summary">
      {Object.entries(monitorLabels).map(([key, label]) => <button key={key} onClick={() => setKind(key)} className={kind === key ? 'active' : ''}><span>{label}</span><strong>{counts[key] || 0}</strong><small>{key === 'consultation' ? '신규 문의와 알림 결과' : key === 'case' ? '후보·면접·입사 단계' : key === 'content' ? '공개·마감·수정 상태' : '주문·승인·환불 상태'}</small></button>)}
    </div>
    <div className="admin-monitor-toolbar">
      <div><button className={kind === 'all' ? 'active' : ''} onClick={() => setKind('all')}>전체 <b>{records.length}</b></button>{Object.entries(monitorLabels).map(([key,label]) => <button className={kind === key ? 'active' : ''} key={key} onClick={() => setKind(key)}>{label} <b>{counts[key] || 0}</b></button>)}</div>
      <label><Search /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="이름·병원·공고·주문번호 검색" /></label>
    </div>
    <div className="admin-monitor-table">
      <div className="head"><span>구분</span><span>대상·내용</span><span>현재 상태</span><span>최근 변경</span><span>확인</span></div>
      {visible.map((item) => <button key={`${item.monitorType}-${item.id}`} onClick={() => setSelected(item)}><span className={`monitor-kind ${item.monitorType}`}>{monitorLabels[item.monitorType]}</span><span><strong>{item.monitorTitle}</strong><small>{item.monitorSubtitle}</small></span><em className={`monitor-status ${item.status || item.stage}`}>{item.monitorStatus}</em><time>{String(item.monitorDate || '-').slice(0,16).replace('T',' ')}</time><i><Eye />상세</i></button>)}
      {!visible.length && <div className="admin-monitor-empty"><Activity /><span>조건에 맞는 운영 내역이 없습니다.</span></div>}
    </div>
    {selected && <MonitorDetail item={selected} onClose={() => setSelected(null)} onManage={() => openManager(selected)} />}
  </section>;
}

function MonitorDetail({ item, onClose, onManage }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    const handleKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', handleKey); };
  }, [onClose]);
  const common = [
    ['데이터 ID', item.id],
    ['현재 상태', item.monitorStatus],
    ['최초 등록', item.createdAt],
    ['최근 변경', item.updatedAt || item.monitorDate],
  ];
  const details = item.monitorType === 'consultation' ? [
    ['신청자', item.requesterName], ['구분', item.requestType === 'hospital' ? '병원 구인희망' : '의사 구직희망'], ['전화번호', item.phone], ['이메일', item.email], ['진료과', item.specialty], ['관리자 메모', item.adminNote || '작성된 메모 없음'], ['메일 알림', item.emailNotificationStatus], ['문자 알림', item.smsNotificationStatus], ...Object.entries(item.payload || {}).map(([key,value]) => [key, value]),
  ] : item.monitorType === 'case' ? [
    ['병원', item.hospitalName], ['포지션', item.positionTitle], ['진료과', item.specialty], ['담당 헤드헌터', item.assignedRecruiter || '미배정'], ['다음 업무', item.nextAction || '미지정'], ['후보 수', `${item.candidateCount || 0}명`], ['예상 성공보수', `${(Number(item.estimatedFee) || 0).toLocaleString()}원`], ['청구 기준', item.billingStatus],
  ] : item.monitorType === 'content' ? [
    ['콘텐츠 유형', contentTypeLabels[item.contentType]], ['기관·보조 제목', item.subtitle], ['열람 권한', item.visibility], ['작성자', item.createdBy], ['최근 수정자', item.updatedBy], ...Object.entries(item.payload || {}).map(([key,value]) => [key, value]),
  ] : [
    ['주문번호', item.orderNumber], ['회원 유형', item.accountRole], ['구매자', item.customerName], ['이메일', item.customerEmail], ['전화번호', item.customerPhone], ['결제수단', item.paymentMethod || '미지정'], ['공급가액', `${(Number(item.supplyAmount) || 0).toLocaleString()}원`], ['부가세', `${(Number(item.taxAmount) || 0).toLocaleString()}원`], ['결제금액', `${(Number(item.totalAmount) || 0).toLocaleString()}원`], ['관리자 메모', item.adminNote || '작성된 메모 없음'],
  ];
  return <div className="admin-content-detail-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="admin-content-detail admin-monitor-detail" role="dialog" aria-modal="true" aria-labelledby="admin-monitor-detail-title">
      <header><div><small>OPERATION RECORD DETAIL</small><span className={`monitor-kind ${item.monitorType}`}>{monitorLabels[item.monitorType]}</span><h2 id="admin-monitor-detail-title">{item.monitorTitle}</h2><p>{item.monitorSubtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="상세 내용 닫기"><X /></button></header>
      <div className="admin-content-detail-meta">{common.map(([label,value], index) => <div key={label}>{index === 1 ? <Activity /> : index === 0 ? <Database /> : <FileText />}<span><small>{label}</small><strong>{String(value || '-').slice(0,40).replace('T',' ')}</strong></span></div>)}</div>
      <div className="admin-monitor-detail-body"><h3>접수·처리 상세정보</h3><dl>{details.filter(([,value]) => value !== undefined && value !== null && value !== '').map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</dd></div>)}</dl></div>
      <footer><button className="button outline" onClick={onClose}>닫기</button><button className="admin-primary" onClick={onManage}>담당 관리 화면 열기 <ChevronRight /></button></footer>
    </section>
  </div>;
}

function Categories({ data, setData, mutate, qa }) {
  const [groupKey, setGroupKey] = useState('doctor_specialty');
  const [name, setName] = useState('');
  const visible = data.categories.filter((item) => item.groupKey === groupKey);
  const create = async () => {
    const clean = name.trim();
    if (!clean) return;
    const slug = clean.toLowerCase().replace(/\s+/g, '-');
    if (qa) setData((old) => ({ ...old, categories: [...old.categories, { id: crypto.randomUUID(), groupKey, name: clean, slug, sortOrder: visible.length * 10 + 10, enabled: true }] }));
    await mutate('category_create', { groupKey, name: clean, slug, sortOrder: visible.length * 10 + 10 }, '카테고리를 추가했습니다.');
    setName('');
  };
  const toggle = async (item) => {
    if (qa) setData((old) => ({ ...old, categories: old.categories.map((entry) => entry.id === item.id ? { ...entry, enabled: !entry.enabled } : entry) }));
    await mutate('category_update', { id: item.id, enabled: !item.enabled }, '공개 상태를 변경했습니다.');
  };
  const remove = async (item) => {
    if (qa) setData((old) => ({ ...old, categories: old.categories.filter((entry) => entry.id !== item.id) }));
    await mutate('category_delete', { id: item.id }, '카테고리를 삭제했습니다.');
  };
  return <section className="admin-panel">
    <header><div><small>CATEGORY MANAGEMENT</small><h2>검색과 등록 양식의 기준 정보</h2><p>분류를 수정하면 공고·이력서·검색 필터에 일관되게 반영됩니다.</p></div></header>
    <div className="admin-category-tabs">{Object.entries(categoryLabels).map(([key, label]) => <button className={key === groupKey ? 'active' : ''} key={key} onClick={() => setGroupKey(key)}><span>{label}</span><b>{data.categories.filter((item) => item.groupKey === key).length}</b></button>)}</div>
    <div className="admin-category-add"><input value={name} onChange={(event) => setName(event.target.value)} placeholder={`${categoryLabels[groupKey]} 이름`} onKeyDown={(event) => event.key === 'Enter' && create()} /><button onClick={create}><Plus />추가</button></div>
    <div className="admin-category-table">
      <div className="head"><span>순서</span><span>이름</span><span>식별값</span><span>공개</span><span>관리</span></div>
      {visible.map((item) => <div key={item.id}><span>{item.sortOrder}</span><strong>{item.name}</strong><code>{item.slug}</code><button className={`admin-switch ${item.enabled ? 'on' : ''}`} onClick={() => toggle(item)} aria-label={`${item.name} 공개 상태`}><i /></button><button className="icon-button" onClick={() => remove(item)} aria-label={`${item.name} 삭제`}><Trash2 /></button></div>)}
    </div>
  </section>;
}

const contentTypeLabels = {
  doctor_job: '의사 초빙공고',
  medical_job: '의료인 채용공고',
  talent_profile: '인재 프로필',
  notice: '공지 · 콘텐츠',
};

const emptyContent = {
  contentType:'doctor_job', title:'', subtitle:'', status:'draft', visibility:'public',
  payload:{ primary:'', secondary:'', description:'', department:'', region:'', role:'', employmentType:'', career:'', pay:'', deadline:'', schedule:'' },
};

function ContentManager({ data, setData, mutate, qa }) {
  const [type, setType] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const contents = data.contents || [];
  const visible = contents.filter((item) => (type === 'all' || item.contentType === type) && (!keyword || `${item.title} ${item.subtitle}`.toLowerCase().includes(keyword.toLowerCase())));
  const openNew = () => setEditing({ ...emptyContent, payload:{ ...emptyContent.payload } });
  const openEdit = (item) => {
    if (item.source === 'catalog') return;
    setSelected(null);
    setEditing({ ...item, payload:{ ...emptyContent.payload, ...(item.payload || {}) } });
  };
  const change = (key, value) => setEditing((old) => ({ ...old, [key]:value }));
  const changePayload = (key, value) => setEditing((old) => ({ ...old, payload:{ ...old.payload, [key]:value } }));
  const save = async () => {
    if (!editing?.title.trim()) return;
    const isUpdate = Boolean(editing.id);
    const record = { ...editing, title:editing.title.trim(), subtitle:editing.subtitle.trim(), updatedAt:new Date().toISOString().slice(0,16).replace('T',' ') };
    if (qa) setData((old) => ({ ...old, contents:isUpdate ? (old.contents || []).map((item) => item.id === record.id ? record : item) : [{ ...record, id:crypto.randomUUID() }, ...(old.contents || [])], metrics:{ ...old.metrics, contents:isUpdate ? old.metrics.contents : (old.metrics.contents || 0) + 1 } }));
    const saved = await mutate(isUpdate ? 'content_update' : 'content_create', record, isUpdate ? '콘텐츠를 수정했습니다.' : '새 콘텐츠를 등록했습니다.');
    if (qa || saved) setEditing(null);
  };
  const remove = async (item) => {
    if (item.source === 'catalog') return;
    if (!window.confirm(`‘${item.title}’ 항목을 삭제할까요? 삭제 후에는 목록에서 복구할 수 없습니다.`)) return;
    if (qa) setData((old) => ({ ...old, contents:(old.contents || []).filter((entry) => entry.id !== item.id), metrics:{ ...old.metrics, contents:Math.max(0,(old.metrics.contents || 0)-1) } }));
    await mutate('content_delete', { id:item.id }, '콘텐츠를 삭제했습니다.');
  };
  return <section className="admin-panel admin-content-manager">
    <header><div><small>CONTENT DATA MANAGEMENT</small><h2>공고 · 인재 · 게시글 통합 관리</h2><p>등록, 수정, 공개 범위, 종료와 삭제를 한곳에서 처리하며 모든 변경은 감사 로그에 남습니다.</p></div><button className="admin-primary" onClick={openNew}><Plus />새 글 작성</button></header>
    <div className="admin-content-toolbar">
      <div>{[['all','전체'], ...Object.entries(contentTypeLabels)].map(([key,label]) => <button key={key} className={type === key ? 'active' : ''} onClick={() => setType(key)}>{label}<b>{key === 'all' ? contents.length : contents.filter((item) => item.contentType === key).length}</b></button>)}</div>
      <label><Search /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="제목·기관명 검색" /></label>
    </div>
    {editing && <div className="admin-content-editor">
      <header><div><small>{editing.id ? 'EDIT CONTENT' : 'NEW CONTENT'}</small><h3>{editing.id ? '운영 데이터 수정' : '새 운영 데이터 등록'}</h3></div><button className="icon-button" onClick={() => setEditing(null)} aria-label="편집 닫기"><X /></button></header>
      <div className="admin-content-form">
        <label><span>콘텐츠 유형 *</span><select value={editing.contentType} onChange={(e) => change('contentType',e.target.value)}>{Object.entries(contentTypeLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label><span>운영 상태 *</span><select value={editing.status} onChange={(e) => change('status',e.target.value)}><option value="draft">임시저장</option><option value="published">공개</option><option value="hidden">숨김</option><option value="closed">마감·종료</option></select></label>
        <label><span>열람 권한 *</span><select value={editing.visibility} onChange={(e) => change('visibility',e.target.value)}><option value="public">전체 공개</option><option value="doctor">일반 회원</option><option value="hospital">병원 회원</option><option value="admin">관리자 전용</option></select></label>
        <label className="wide"><span>제목 *</span><input value={editing.title} onChange={(e) => change('title',e.target.value)} placeholder="공고 또는 게시글 제목" /></label>
        <label className="wide"><span>기관명·보조 제목</span><input value={editing.subtitle} onChange={(e) => change('subtitle',e.target.value)} placeholder="병원명, 공개용 후보명, 카테고리" /></label>
        <label><span>지역·주요 분류</span><input value={editing.payload.primary} onChange={(e) => changePayload('primary',e.target.value)} placeholder="예: 부산 해운대구" /></label>
        <label><span>급여·핵심 조건</span><input value={editing.payload.secondary} onChange={(e) => changePayload('secondary',e.target.value)} placeholder="예: 월 1,500만원~" /></label>
        <label><span>진료과·의료인 직군</span><input value={editing.payload.department || editing.payload.role || ''} onChange={(e) => { changePayload('department',e.target.value); changePayload('role',e.target.value); }} placeholder="예: 정형외과, 간호사" /></label>
        <label><span>근무 지역</span><input value={editing.payload.region || ''} onChange={(e) => changePayload('region',e.target.value)} placeholder="예: 부산" /></label>
        <label><span>고용·근무 형태</span><input value={editing.payload.employmentType || ''} onChange={(e) => changePayload('employmentType',e.target.value)} placeholder="예: 정규직, 주 4.5일" /></label>
        <label><span>경력 조건</span><input value={editing.payload.career || ''} onChange={(e) => changePayload('career',e.target.value)} placeholder="예: 전문의 5년, 경력무관" /></label>
        <label><span>급여</span><input value={editing.payload.pay || ''} onChange={(e) => changePayload('pay',e.target.value)} placeholder="예: 월 1,500만원~" /></label>
        <label><span>마감일</span><input value={editing.payload.deadline || ''} onChange={(e) => changePayload('deadline',e.target.value)} placeholder="예: 2026.08.31, 상시채용" /></label>
        <label className="wide"><span>근무 일정</span><input value={editing.payload.schedule || ''} onChange={(e) => changePayload('schedule',e.target.value)} placeholder="예: 평일 09:00~18:00 · 토요일 격주" /></label>
        <label className="wide"><span>상세 설명</span><textarea value={editing.payload.description} onChange={(e) => changePayload('description',e.target.value)} placeholder="근무조건, 경력, 공개 기준 등 운영에 필요한 내용을 입력하세요." /></label>
      </div>
      <footer><span><ShieldCheck /> 저장 시 관리자와 변경 시각이 자동 기록됩니다.</span><div><button className="button outline" onClick={() => setEditing(null)}>취소</button><button className="admin-primary" disabled={!editing.title.trim()} onClick={save}><Save />{editing.id ? '수정 저장' : '등록하기'}</button></div></footer>
    </div>}
    <div className="admin-content-table">
      <div className="head"><span>유형</span><span>제목·기관</span><span>공개 범위</span><span>상태</span><span>최근 수정</span><span>관리</span></div>
      {visible.map((item) => <div className="admin-content-row" key={item.id} role="button" tabIndex="0" onClick={() => setSelected(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(item); } }}><span className={`content-kind ${item.contentType}`}>{contentTypeLabels[item.contentType]}</span><div><strong>{item.title}</strong><small>{item.subtitle || '보조 정보 없음'} · <b className={`content-source ${item.source}`}>{item.source === 'catalog' ? '기본 콘텐츠' : '운영 DB'}</b></small></div><span className="content-visibility"><Eye />{{public:'전체',doctor:'의사',hospital:'병원',admin:'관리자'}[item.visibility]}</span><span className={`content-status ${item.status}`}>{{draft:'임시저장',published:'공개 중',hidden:'숨김',closed:'마감'}[item.status]}</span><time>{String(item.updatedAt || '').slice(0,16).replace('T',' ') || '-'}</time><div className="content-actions"><button onClick={(event) => { event.stopPropagation(); setSelected(item); }}><Eye />상세</button>{item.source !== 'catalog' && <><button onClick={(event) => { event.stopPropagation(); openEdit(item); }}><PencilLine />수정</button><button onClick={(event) => { event.stopPropagation(); remove(item); }} aria-label={`${item.title} 삭제`}><Trash2 /></button></>}</div></div>)}
      {!visible.length && <div className="admin-content-empty"><FileText /><span>조건에 맞는 운영 데이터가 없습니다.</span></div>}
    </div>
    {selected && <ContentDetail item={selected} onClose={() => setSelected(null)} onEdit={() => openEdit(selected)} />}
  </section>;
}

function ContentDetail({ item, onClose, onEdit }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    const handleKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', handleKey); };
  }, [onClose]);
  const payload = Object.entries(item.payload || {}).filter(([, value]) => value !== '' && value !== null && value !== undefined);
  const visibility = { public:'전체 공개', doctor:'일반 회원', hospital:'병원 회원', admin:'관리자 전용' }[item.visibility] || item.visibility;
  const status = { draft:'임시저장', published:'공개 중', hidden:'숨김', closed:'마감·종료' }[item.status] || item.status;
  const payloadLabels = { primary:'지역·주요 분류', secondary:'급여·핵심 조건', description:'상세 설명' };
  return <div className="admin-content-detail-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="admin-content-detail" role="dialog" aria-modal="true" aria-labelledby="admin-content-detail-title">
      <header><div><small>CONTENT RECORD DETAIL</small><span className={`content-kind ${item.contentType}`}>{contentTypeLabels[item.contentType]}</span><h2 id="admin-content-detail-title">{item.title}</h2><p>{item.subtitle || '보조 정보 없음'}</p></div><button className="icon-button" onClick={onClose} aria-label="상세 내용 닫기"><X /></button></header>
      <div className="admin-content-detail-meta">
        <div><Eye /><span><small>공개 범위</small><strong>{visibility}</strong></span></div>
        <div><Activity /><span><small>운영 상태</small><strong>{status}</strong></span></div>
        <div><UserRoundCog /><span><small>작성자</small><strong>{item.createdBy || '관리자 QA'}</strong></span></div>
        <div><PencilLine /><span><small>최근 수정자</small><strong>{item.updatedBy || item.createdBy || '관리자 QA'}</strong></span></div>
      </div>
      <div className="admin-content-detail-body">
        <section><h3>등록 내용</h3>{payload.length ? <dl>{payload.map(([key, value]) => <div className={key === 'description' ? 'wide' : ''} key={key}><dt>{payloadLabels[key] || key}</dt><dd>{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</dd></div>)}</dl> : <p className="admin-content-detail-empty">등록된 상세 내용이 없습니다.</p>}</section>
        <aside><h3>운영 기록</h3><dl><div><dt>데이터 ID</dt><dd>{item.id}</dd></div><div><dt>작성 시각</dt><dd>{String(item.createdAt || '-').slice(0,16).replace('T',' ')}</dd></div><div><dt>최근 수정</dt><dd>{String(item.updatedAt || '-').slice(0,16).replace('T',' ')}</dd></div><div><dt>공개 시작</dt><dd>{String(item.publishedAt || '-').slice(0,16).replace('T',' ')}</dd></div></dl><p><ShieldCheck /> 수정·공개·삭제 작업은 관리자 변경 이력에 기록됩니다.</p></aside>
      </div>
      <footer><button className="button outline" onClick={onClose}>닫기</button>{item.source !== 'catalog' ? <button className="admin-primary" onClick={onEdit}><PencilLine />이 내용 수정</button> : <span className="catalog-readonly"><ShieldCheck /> 기본 콘텐츠는 여기서 읽기만 할 수 있습니다.</span>}</footer>
    </section>
  </div>;
}

function SiteSettings({ data, setData, mutate }) {
  const [form, setForm] = useState(data.settings);
  useEffect(() => setForm(data.settings), [data.settings]);
  const save = async () => {
    setData((old) => ({ ...old, settings: form }));
    await mutate('settings_update', form, '사이트 기본정보를 저장했습니다.');
  };
  return <section className="admin-panel">
    <header><div><small>SITE SETTINGS</small><h2>사이트 기본정보</h2><p>고객에게 표시되는 대표 연락처와 운영 안내를 관리합니다.</p></div><button className="admin-primary" onClick={save}><Save />저장</button></header>
    <div className="admin-form-grid">
      <label><span>사이트명</span><input value={form.siteName || ''} onChange={(e) => setForm({ ...form, siteName: e.target.value })} /></label>
      <label><span>대표 전화</span><input value={form.supportPhone || ''} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} /></label>
      <label><span>대표 이메일</span><input value={form.supportEmail || ''} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} /></label>
      <label className="wide"><span>운영 안내 문구</span><input value={form.announcement || ''} onChange={(e) => setForm({ ...form, announcement: e.target.value })} /></label>
    </div>
  </section>;
}

function Features({ data, setData, mutate }) {
  const toggle = async (key) => {
    const enabled = !data.features[key];
    setData((old) => ({ ...old, features: { ...old.features, [key]: enabled } }));
    await mutate('feature_update', { key, enabled }, '기능 공개 상태를 변경했습니다.');
  };
  return <section className="admin-panel">
    <header><div><small>FEATURE FLAGS</small><h2>사이트 기능 공개 설정</h2><p>준비가 끝난 기능만 사용자 화면에 공개할 수 있습니다.</p></div></header>
    <div className="admin-feature-grid">{Object.entries(featureLabels).map(([key, [title, copy]]) => <article key={key}><span><Settings /></span><div><strong>{title}</strong><p>{copy}</p></div><button className={`admin-switch ${data.features[key] ? 'on' : ''}`} onClick={() => toggle(key)} aria-label={`${title} 공개 상태`}><i /></button></article>)}</div>
  </section>;
}

function Members({ data, mutate }) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const members = (data.members || []).filter((member) => {
    const text = [member.email, member.fullName, member.phone, member.organization, member.jobTitle].join(' ').toLowerCase();
    return (role === 'all' || member.role === role) && text.includes(query.trim().toLowerCase());
  });
  return <>
    <section className="admin-member-summary">
      <article><UserRoundCog /><strong>{data.metrics.doctors}</strong><p>일반 회원</p><small>의료직군·자격 인증 상태와 결제 이력 연결</small></article>
      <article><Building2 /><strong>{data.metrics.hospitals}</strong><p>병원 회원</p><small>기관·담당자·광고 주문 연결</small></article>
      <article><CreditCard /><strong>{data.metrics.payments || 0}</strong><p>전체 결제 주문</p><small>회원별 누적 결제액 추적</small></article>
    </section>
    <section className="admin-panel admin-member-manager">
      <header><div><small>MEMBER DATABASE</small><h2>회원가입 회원 정보 DB</h2><p>계정, 연락처, 회원 유형, 인증·활동 상태, 약관 동의와 결제 누계를 한곳에서 확인합니다.</p></div></header>
      <div className="admin-data-toolbar">
        <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름·이메일·병원·연락처 검색" /></label>
        <select value={role} onChange={(event) => setRole(event.target.value)}><option value="all">전체 회원</option><option value="doctor">일반 회원</option><option value="hospital">병원 회원</option></select>
        <span>검색 결과 <b>{members.length}</b>명</span>
      </div>
      <div className="admin-member-table">
        <div className="head"><span>회원</span><span>유형·기관</span><span>인증</span><span>약관·결제</span><span>가입·접속</span><span>관리</span></div>
        {members.map((member) => <MemberRow member={member} mutate={mutate} key={member.id} />)}
        {!members.length && <div className="admin-data-empty">조건에 맞는 회원이 없습니다.</div>}
      </div>
    </section>
  </>;
}

function MemberRow({ member, mutate }) {
  const [status, setStatus] = useState(member.status || 'active');
  const [verificationStatus, setVerificationStatus] = useState(member.verificationStatus || 'unverified');
  const save = () => mutate('member_update', { id:member.id, status, verificationStatus }, '회원 상태와 인증 정보를 저장했습니다.');
  return <div className="member-row">
    <div><strong>{member.fullName || '이름 미등록'}</strong><small>{member.email || '이메일 비공개'}</small><small>{member.phone || '연락처 미등록'}</small></div>
    <div><span className={`member-role ${member.role}`}>{member.role === 'doctor' ? '의사' : '병원'}</span><strong>{member.organization || member.jobTitle || '-'}</strong><small>{member.jobTitle || '직함 미등록'}</small></div>
    <div><select value={verificationStatus} onChange={(event) => setVerificationStatus(event.target.value)}><option value="unverified">미인증</option><option value="pending">확인 중</option><option value="verified">인증 완료</option><option value="rejected">인증 반려</option></select><small>계정 {status === 'active' ? '정상' : status === 'suspended' ? '정지' : '탈퇴'}</small></div>
    <div><strong>동의 {member.consentCount || 0}건</strong><small>주문 {member.orderCount || 0}건</small><b>{Number(member.lifetimeValue || 0).toLocaleString()}원</b></div>
    <div><small>가입 {String(member.createdAt || '-').slice(0,16)}</small><small>최근 {String(member.lastLoginAt || '-').slice(0,16)}</small></div>
    <div><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">정상</option><option value="suspended">이용 정지</option><option value="withdrawn">탈퇴</option></select><button className="admin-primary" onClick={save}><Save />저장</button></div>
  </div>;
}

const paymentStatusLabel = {
  pending_review:'검수 대기', awaiting_payment:'결제 대기', paid:'결제 완료', failed:'결제 실패',
  cancelled:'취소', partially_refunded:'부분 환불', refunded:'전액 환불'
};

function Payments({ data, mutate }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const filtered = (data.payments || []).filter((payment) => {
    const text = [payment.orderNumber, payment.productName, payment.customerName, payment.customerEmail, payment.customerPhone].join(' ').toLowerCase();
    return (statusFilter === 'all' || payment.status === statusFilter) && text.includes(query.trim().toLowerCase());
  });
  const [selectedId, setSelectedId] = useState(filtered[0]?.id || data.payments?.[0]?.id || '');
  const selected = (data.payments || []).find((payment) => payment.id === selectedId) || filtered[0] || null;
  useEffect(() => { if (!selected && filtered[0]) setSelectedId(filtered[0].id); }, [selected, filtered]);
  return <section className="admin-panel admin-payment-manager">
    <header><div><small>PAYMENT LEDGER</small><h2>결제 · 거래 · 환불 통합 원장</h2><p>주문번호를 기준으로 회원, 상품, 공급가·부가세, 승인·실패·취소와 환불 기록을 연결해 보관합니다.</p></div></header>
    <div className="admin-payment-metrics">
      <article><span>전체 주문</span><strong>{data.metrics.payments || 0}건</strong></article>
      <article><span>처리 대기</span><strong>{data.metrics.pendingPayments || 0}건</strong></article>
      <article><span>결제 완료액</span><strong>{Number(data.metrics.paidRevenue || 0).toLocaleString()}원</strong></article>
      <article><span>환불 주문</span><strong>{data.metrics.refundedPayments || 0}건</strong></article>
    </div>
    <div className="admin-data-toolbar">
      <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="주문번호·회원·상품 검색" /></label>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">전체 상태</option>{Object.entries(paymentStatusLabel).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select>
      <span>검색 결과 <b>{filtered.length}</b>건</span>
    </div>
    <div className="admin-payment-layout">
      <div className="admin-payment-list">
        {filtered.map((payment) => <button className={payment.id === selected?.id ? 'active' : ''} onClick={() => setSelectedId(payment.id)} key={payment.id}><span className={`payment-status ${payment.status}`}>{paymentStatusLabel[payment.status] || payment.status}</span><div><strong>{payment.productName}</strong><small>{payment.orderNumber}</small><small>{payment.customerName} · {payment.customerEmail}</small>{payment.exposure && <small className="payment-exposure">노출 {payment.exposure.start} ~ {payment.exposure.end}</small>}</div><b>{Number(payment.totalAmount).toLocaleString()}원</b><time>{String(payment.createdAt || '').slice(0,16)}</time></button>)}
        {!filtered.length && <div className="admin-data-empty">조건에 맞는 결제 주문이 없습니다.</div>}
      </div>
      {selected ? <PaymentDetail payment={selected} transactions={data.transactions || []} refunds={data.refunds || []} mutate={mutate} /> : <div className="admin-payment-detail admin-data-empty">확인할 주문을 선택해주세요.</div>}
    </div>
  </section>;
}

function PaymentDetail({ payment, transactions, refunds, mutate }) {
  const [status, setStatus] = useState(payment.status);
  const [method, setMethod] = useState(payment.paymentMethod || 'card');
  const [providerTransactionId, setProviderTransactionId] = useState('');
  const [adminNote, setAdminNote] = useState(payment.adminNote || '');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  useEffect(() => { setStatus(payment.status); setMethod(payment.paymentMethod || 'card'); setAdminNote(payment.adminNote || ''); setProviderTransactionId(''); setRefundAmount(''); setRefundReason(''); }, [payment.id]);
  const [showReceipt, setShowReceipt] = useState(false);
  const orderTransactions = transactions.filter((item) => item.orderId === payment.id);
  const orderRefunds = refunds.filter((item) => item.orderId === payment.id);
  const save = () => mutate('payment_update', { id:payment.id, status, paymentMethod:method, provider:'manual', providerTransactionId, adminNote }, '결제 상태와 거래 이력을 저장했습니다.');
  const refund = async () => {
    const saved = await mutate('refund_create', { orderId:payment.id, amount:Number(refundAmount), reason:refundReason }, '환불 요청을 원장에 기록했습니다.');
    if (saved) { setRefundAmount(''); setRefundReason(''); }
  };
  const resolveRefund = (refundId, decision) => mutate('refund_resolve', { refundId, decision }, decision === 'approve' ? '환불 요청을 승인했습니다.' : '환불 요청을 거부했습니다.');
  // 영수증 모달용 매핑(회원 영수증과 동일 포맷).
  const receiptPayload = { id:payment.orderNumber, item:payment.productName, date:String(payment.paidAt || payment.createdAt || '').slice(0,10), method:payment.paymentMethod === 'transfer' ? '계좌이체' : '카드', status:paymentStatusLabel[payment.status] || payment.status, total:Number(payment.totalAmount||0), supply:Number(payment.supplyAmount||Math.round(Number(payment.totalAmount||0)/1.1)), tax:Number(payment.taxAmount||(Number(payment.totalAmount||0)-Math.round(Number(payment.totalAmount||0)/1.1))), customerName:payment.customerName };
  return <div className="admin-payment-detail">
    <header><div><small>ORDER DETAIL</small><h3>{payment.orderNumber}</h3></div><div className="admin-order-head-actions"><button type="button" className="admin-receipt-btn" onClick={() => setShowReceipt(true)}><ReceiptText /> 영수증</button><span className={`payment-status ${payment.status}`}>{paymentStatusLabel[payment.status]}</span></div></header>
    {showReceipt && <ReceiptModal payment={receiptPayload} buyerName={payment.customerName} onClose={() => setShowReceipt(false)} />}
    <dl>
      <div><dt>회원</dt><dd>{payment.customerName || '-'}<small>{payment.customerEmail}<br />{payment.customerPhone}</small></dd></div>
      <div><dt>상품</dt><dd>{payment.productName}<small>{payment.accountRole === 'hospital' ? '병원 회원' : '일반 회원'} · {payment.productType}</small></dd></div>
      <div><dt>결제금액</dt><dd><b>{Number(payment.totalAmount).toLocaleString()}원</b><small>공급가 {Number(payment.supplyAmount).toLocaleString()}원 · 부가세 {Number(payment.taxAmount).toLocaleString()}원</small></dd></div>
      <div><dt>처리시각</dt><dd>{String(payment.createdAt || '-').slice(0,16)}<small>결제 {String(payment.paidAt || '-').slice(0,16)}</small></dd></div>
    </dl>
    <div className="payment-admin-form">
      <label><span>주문 상태</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="pending_review">검수 대기</option><option value="awaiting_payment">결제 대기</option><option value="paid">결제 완료</option><option value="failed">결제 실패</option><option value="cancelled">취소</option></select></label>
      <label><span>결제 수단</span><select value={method} onChange={(event) => setMethod(event.target.value)}><option value="card">카드</option><option value="transfer">계좌이체</option></select></label>
      <label className="wide"><span>PG·승인 거래번호</span><input value={providerTransactionId} onChange={(event) => setProviderTransactionId(event.target.value)} placeholder="승인번호 또는 PG 거래번호" /></label>
      <label className="wide"><span>관리 메모</span><textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows="2" placeholder="검수, 입금 확인, 실패 사유 등" /></label>
      <button className="admin-primary wide" onClick={save}><Save />결제 상태 저장</button>
    </div>
    <section className="payment-history"><h4><ReceiptText />거래 이력</h4>{orderTransactions.map((item) => <div key={item.id}><span>{item.transactionType}</span><strong>{Number(item.amount).toLocaleString()}원</strong><small>{item.providerTransactionId || item.provider}</small><time>{String(item.processedAt || '').slice(0,16)}</time></div>)}{!orderTransactions.length && <p>아직 승인·실패 거래가 없습니다.</p>}</section>
    {orderRefunds.some((item) => item.status === 'requested') && <section className="payment-refund-requests"><h4><RotateCcw />회원 환불(청약철회) 요청</h4>{orderRefunds.filter((item) => item.status === 'requested').map((item) => <div key={item.id} className="refund-request-row"><div><strong>환불 요청</strong><small>{item.reason || '사유 미입력'}</small><small>요청자 {item.requestedBy || '회원'}</small></div><div className="refund-request-actions"><button type="button" className="admin-primary" onClick={() => resolveRefund(item.id, 'approve')}>승인(전액 환불)</button><button type="button" className="admin-ghost" onClick={() => resolveRefund(item.id, 'reject')}>거부</button></div></div>)}</section>}
    {['paid','partially_refunded'].includes(payment.status) && <section className="payment-refund"><h4><RotateCcw />환불 접수(관리자 직접)</h4><div><input value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} inputMode="numeric" placeholder="환불 금액" /><input value={refundReason} onChange={(event) => setRefundReason(event.target.value)} placeholder="환불 사유" /><button onClick={refund}>환불 기록</button></div>{orderRefunds.filter((item) => item.status !== 'requested').map((item) => <p key={item.id}>{Number(item.amount).toLocaleString()}원 · {item.status} · {item.reason}</p>)}</section>}
  </div>;
}

function DatabaseStatus({ metrics }) {
  const rows = [['accounts', '회원 계정', metrics.accounts], ['account_admin_profiles', '회원 인증·운영 정보', metrics.accounts], ['payment_orders', '결제 주문 원장', metrics.payments || 0], ['payment_transactions', '승인·실패 거래', metrics.payments || 0], ['payment_refunds', '환불 원장', metrics.refundedPayments || 0], ['consultation_requests', '상담 접수', metrics.consultations], ['recruitment_cases', '채용 CRM', metrics.activeCases + metrics.hiredCases], ['admin_content_records', '공고·인재·게시글', metrics.contents || 0], ['admin_categories', '운영 카테고리', metrics.categories], ['admin_audit_logs', '관리자 변경 이력', metrics.auditLogs]];
  return <section className="admin-panel"><header><div><small>DATABASE OVERVIEW</small><h2>DB 테이블 현황</h2><p>안전을 위해 임의 SQL 실행 대신 승인된 관리 기능만 제공합니다.</p></div></header><div className="admin-db-table">{rows.map(([table, label, count]) => <div key={table}><Database /><code>{table}</code><strong>{label}</strong><span>{count.toLocaleString()} records</span><em>정상</em></div>)}</div></section>;
}

function Audit({ audit = [] }) {
  return <section className="admin-panel"><header><div><small>AUDIT LOG</small><h2>관리자 변경 이력</h2><p>카테고리, 기능, 사이트 설정 변경을 추적합니다.</p></div></header><div className="admin-audit-list">{audit.map((item) => <article key={item.id}><span><Activity /></span><div><strong>{item.subject}</strong><p>{item.action}</p></div><small>{item.actor}</small><time>{item.createdAt}</time></article>)}</div></section>;
}

// 인재 이력서 열람 감사: 병원별 열람량과 이상 열람(한도 초과·단시간 폭주) 경고를 보여준다.
const alertActionLabel = { talent_unlock_blocked: '열람 한도 초과 차단', talent_unlock_burst: '단시간 대량 열람 경고' };
function TalentAccessAudit({ active }) {
  const [state, setState] = useState({ loading: true, error: '', viewers: [], alerts: [], recent: [] });
  useEffect(() => {
    if (!active) return;
    let live = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    fetch('/api/talent-access-audit', { credentials: 'same-origin', headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('audit'))))
      .then((r) => live && setState({ loading: false, error: '', viewers: r.viewers || [], alerts: r.alerts || [], recent: r.recent || [] }))
      .catch(() => live && setState({ loading: false, error: '열람 감사 데이터를 불러오지 못했습니다. 배포 환경에서만 조회됩니다.', viewers: [], alerts: [], recent: [] }));
    return () => { live = false; };
  }, [active]);
  const fmt = (t) => String(t || '').slice(0, 16).replace('T', ' ');
  return <section className="admin-panel"><header><div><small>TALENT ACCESS AUDIT</small><h2>인재 열람 감사</h2><p>병원별 이력서 열람량과 이상 열람(대량 수집)을 추적해 정보 유출을 방어합니다.</p></div></header>
    {state.loading ? <div className="admin-empty"><ShieldAlert /><p>불러오는 중…</p></div> : <>
      {state.error && <div className="admin-empty"><ShieldAlert /><p>{state.error}</p></div>}
      <div className="talent-audit-block">
        <h3><ShieldAlert /> 이상 열람 경고 (최근 7일)</h3>
        {state.alerts.length === 0
          ? <p className="talent-audit-none">경고가 없습니다. 정상 범위 내 열람입니다.</p>
          : <div className="talent-audit-alerts">{state.alerts.map((a, i) => <article key={i} className={`talent-audit-alert ${a.action}`}><strong>{alertActionLabel[a.action] || a.action}</strong><span>{a.viewer}</span><em>대상 {a.subject}</em><time>{fmt(a.at)}</time></article>)}</div>}
      </div>
      <div className="talent-audit-block">
        <h3>병원별 열람량 (최근 24시간)</h3>
        {state.viewers.length === 0
          ? <p className="talent-audit-none">최근 24시간 열람 기록이 없습니다.</p>
          : <div className="admin-table-panel"><div className="admin-table-head talent-audit-head"><span>병원 계정</span><span>열람 후보 수</span><span>총 열람</span><span>최근 열람</span></div>
            {state.viewers.map((v, i) => <article key={i} className={`talent-audit-row${v.candidates >= 20 ? ' hot' : ''}`}><div><strong>{v.viewer}</strong></div><span>{v.candidates}명</span><span>{v.views}회</span><time>{fmt(v.lastAt)}</time></article>)}</div>}
      </div>
    </>}
  </section>;
}

const resumeVisibilityLabel = { public: '채용기관 공개', proposal: '제안 시 공개', private: '비공개 보관' };
function Resumes({ data }) {
  const resumes = data.resumes || [];
  return <section className="admin-panel"><header><div><small>MEMBER RESUMES</small><h2>등록된 이력서</h2><p>회원이 등록한 의료인 이력서입니다. 연락처는 헤드헌팅 상담·매칭에만 사용하세요.</p></div><span className="admin-count">{resumes.length}건</span></header>
    {resumes.length === 0
      ? <div className="admin-empty"><FileText /><p>아직 등록된 이력서가 없습니다.</p></div>
      : <div className="admin-table-panel"><div className="admin-table-head admin-resume-head"><span>이력서</span><span>연락처</span><span>희망 지역</span><span>완성도</span><span>공개범위</span><span>등록일</span></div>
        {resumes.map((item) => <article key={item.id} className="admin-resume-row">
          <div><strong>{item.title || '제목 미입력'}</strong><small>{item.name || '이름 미입력'} · {item.profession || '직군 미정'}{item.specialty ? ` · ${item.specialty}` : ''}</small></div>
          <span>{item.phone || '-'}</span>
          <span>{item.desiredRegions || '-'}</span>
          <b>{Number(item.completion) || 0}%</b>
          <em className={`resume-visibility-tag v-${item.visibility}`}>{resumeVisibilityLabel[item.visibility] || item.visibility}</em>
          <time>{(item.updatedAt || item.createdAt || '').slice(0, 10)}</time>
        </article>)}
      </div>}
  </section>;
}
