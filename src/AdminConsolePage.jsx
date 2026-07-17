import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, BriefcaseBusiness, Building2, ChevronRight, Database,
  FileText, FolderKanban, LayoutDashboard, Plus, Save, Settings,
  ShieldCheck, SlidersHorizontal, Trash2, UserRoundCog, UsersRound
} from 'lucide-react';

const groups = [
  { title: '운영 대시보드', items: [
    ['dashboard', '전체 현황', LayoutDashboard],
    ['crm', '채용 CRM', BriefcaseBusiness],
    ['consultations', '상담 접수', UsersRound],
  ] },
  { title: '사이트 관리', items: [
    ['categories', '카테고리 관리', FolderKanban],
    ['settings', '사이트 기본정보', FileText],
    ['features', '기능 설정', SlidersHorizontal],
  ] },
  { title: '회원 · 데이터', items: [
    ['members', '회원 현황', UserRoundCog],
    ['database', 'DB 현황', Database],
    ['audit', '변경 이력', Activity],
  ] },
];

const demoData = {
  metrics: { accounts: 128, doctors: 83, hospitals: 45, consultations: 17, activeCases: 8, hiredCases: 2, categories: 16, auditLogs: 41 },
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
  categories: [
    { id: 'c1', groupKey: 'doctor_specialty', name: '내과', slug: 'internal-medicine', sortOrder: 10, enabled: true },
    { id: 'c2', groupKey: 'doctor_specialty', name: '정형외과', slug: 'orthopedics', sortOrder: 20, enabled: true },
    { id: 'c3', groupKey: 'region', name: '서울', slug: 'seoul', sortOrder: 10, enabled: true },
    { id: 'c4', groupKey: 'medical_role', name: '간호사', slug: 'nurse', sortOrder: 10, enabled: false },
  ],
  audit: [
    { id: 'a1', subject: '의사 초빙공고', action: '기능 공개 설정', actor: 'admin@medihelpers.co.kr', createdAt: '2026-07-17 14:20' },
    { id: 'a2', subject: '진료과 카테고리', action: '정형외과 순서 변경', actor: 'admin@medihelpers.co.kr', createdAt: '2026-07-17 13:44' },
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
  resumeRegistration: ['이력서 등록', '의사 회원 이력서 작성 및 관리'],
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
      setData(await loadConsole());
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
          {section === 'categories' && <Categories data={data} setData={setData} mutate={mutate} qa={qa} />}
          {section === 'settings' && <SiteSettings data={data} setData={setData} mutate={mutate} />}
          {section === 'features' && <Features data={data} setData={setData} mutate={mutate} />}
          {section === 'members' && <Members metrics={data.metrics} />}
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
    ['상담 접수', data.metrics.consultations, UsersRound, '신규·처리 대기 포함'],
    ['진행 채용', data.metrics.activeCases, BriefcaseBusiness, `입사 확정 ${data.metrics.hiredCases}건`],
    ['운영 분류', data.metrics.categories, FolderKanban, '진료과·지역·직군'],
  ];
  return <>
    <div className="admin-metric-grid">{cards.map(([label, value, Icon, copy]) => <article key={label}><span><Icon /></span><div><small>{label}</small><strong>{value.toLocaleString()}</strong><p>{copy}</p></div></article>)}</div>
    <div className="admin-dashboard-grid">
      <section className="admin-panel">
        <header><div><small>QUICK MANAGEMENT</small><h2>빠른 관리</h2></div></header>
        <div className="admin-quick-grid">
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
    <div className="admin-category-tabs">{Object.entries(categoryLabels).map(([key, label]) => <button className={key === groupKey ? 'active' : ''} key={key} onClick={() => setGroupKey(key)}>{label}</button>)}</div>
    <div className="admin-category-add"><input value={name} onChange={(event) => setName(event.target.value)} placeholder={`${categoryLabels[groupKey]} 이름`} onKeyDown={(event) => event.key === 'Enter' && create()} /><button onClick={create}><Plus />추가</button></div>
    <div className="admin-category-table">
      <div className="head"><span>순서</span><span>이름</span><span>식별값</span><span>공개</span><span>관리</span></div>
      {visible.map((item) => <div key={item.id}><span>{item.sortOrder}</span><strong>{item.name}</strong><code>{item.slug}</code><button className={`admin-switch ${item.enabled ? 'on' : ''}`} onClick={() => toggle(item)} aria-label={`${item.name} 공개 상태`}><i /></button><button className="icon-button" onClick={() => remove(item)} aria-label={`${item.name} 삭제`}><Trash2 /></button></div>)}
    </div>
  </section>;
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

function Members({ metrics }) {
  return <section className="admin-panel"><header><div><small>MEMBER MANAGEMENT</small><h2>회원 유형별 현황</h2><p>개인정보 원문 대신 운영에 필요한 집계와 인증 상태를 관리합니다.</p></div></header><div className="admin-member-summary"><article><UserRoundCog /><strong>{metrics.doctors}</strong><p>의사 회원</p><small>면허 인증 연동 예정</small></article><article><Building2 /><strong>{metrics.hospitals}</strong><p>병원 회원</p><small>사업자 인증 연동 예정</small></article><article><ShieldCheck /><strong>권한 기반</strong><p>개인정보 열람</p><small>열람·동의 감사 기록</small></article></div></section>;
}

function DatabaseStatus({ metrics }) {
  const rows = [['accounts', '회원 계정', metrics.accounts], ['consultation_requests', '상담 접수', metrics.consultations], ['recruitment_cases', '채용 CRM', metrics.activeCases + metrics.hiredCases], ['admin_categories', '운영 카테고리', metrics.categories], ['admin_audit_logs', '관리자 변경 이력', metrics.auditLogs]];
  return <section className="admin-panel"><header><div><small>DATABASE OVERVIEW</small><h2>DB 테이블 현황</h2><p>안전을 위해 임의 SQL 실행 대신 승인된 관리 기능만 제공합니다.</p></div></header><div className="admin-db-table">{rows.map(([table, label, count]) => <div key={table}><Database /><code>{table}</code><strong>{label}</strong><span>{count.toLocaleString()} records</span><em>정상</em></div>)}</div></section>;
}

function Audit({ audit = [] }) {
  return <section className="admin-panel"><header><div><small>AUDIT LOG</small><h2>관리자 변경 이력</h2><p>카테고리, 기능, 사이트 설정 변경을 추적합니다.</p></div></header><div className="admin-audit-list">{audit.map((item) => <article key={item.id}><span><Activity /></span><div><strong>{item.subject}</strong><p>{item.action}</p></div><small>{item.actor}</small><time>{item.createdAt}</time></article>)}</div></section>;
}
