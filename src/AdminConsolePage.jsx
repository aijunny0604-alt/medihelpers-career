import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, BriefcaseBusiness, Building2, ChevronRight, Database,
  Eye, FileText, FolderKanban, LayoutDashboard, PencilLine, Plus, Save, Search, Settings,
  ShieldCheck, SlidersHorizontal, Trash2, UserRoundCog, UsersRound, X
} from 'lucide-react';

const groups = [
  { title: '운영 대시보드', items: [
    ['dashboard', '전체 현황', LayoutDashboard],
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
    ['database', 'DB 현황', Database],
    ['audit', '변경 이력', Activity],
  ] },
];

const demoData = {
  metrics: { accounts: 128, doctors: 83, hospitals: 45, consultations: 17, activeCases: 8, hiredCases: 2, categories: 16, contents: 24, auditLogs: 41 },
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
  contents: [
    { id:'p1', contentType:'doctor_job', title:'정형외과 전문의 집중 초빙', subtitle:'해운대바른척추병원', status:'published', visibility:'doctor', updatedAt:'2026-07-17 15:30', payload:{ primary:'부산 해운대구', secondary:'월 1,500만원~', description:'주 4.5일 · 토요일 격주 근무' } },
    { id:'p2', contentType:'medical_job', title:'MRI·CT 방사선사 채용', subtitle:'수원 중앙영상의학센터', status:'published', visibility:'public', updatedAt:'2026-07-17 14:10', payload:{ primary:'경기 수원', secondary:'연 4,500만원~', description:'경력 3년 이상' } },
    { id:'p3', contentType:'talent_profile', title:'가정의학과 · 전문의 4년', subtitle:'정○○ · 이름 비공개', status:'published', visibility:'hospital', updatedAt:'2026-07-17 12:40', payload:{ primary:'경기·인천', secondary:'검진 / 주 4일', description:'후보 동의 후 상세정보 공개' } },
    { id:'p4', contentType:'notice', title:'2026년 하반기 의사 채용 상담 안내', subtitle:'운영 공지', status:'draft', visibility:'public', updatedAt:'2026-07-17 10:20', payload:{ primary:'공지사항', secondary:'', description:'초안 작성 중' } },
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
          {section === 'contents' && <ContentManager data={data} setData={setData} mutate={mutate} qa={qa} />}
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
    ['운영 콘텐츠', data.metrics.contents || 0, PencilLine, '공고·인재·게시글'],
  ];
  return <>
    <div className="admin-metric-grid">{cards.map(([label, value, Icon, copy]) => <article key={label}><span><Icon /></span><div><small>{label}</small><strong>{value.toLocaleString()}</strong><p>{copy}</p></div></article>)}</div>
    <div className="admin-dashboard-grid">
      <section className="admin-panel">
        <header><div><small>QUICK MANAGEMENT</small><h2>빠른 관리</h2></div></header>
        <div className="admin-quick-grid">
          <button onClick={() => select('contents')}><PencilLine /><span><strong>콘텐츠 통합 관리</strong><small>공고·인재·게시글 CRUD</small></span><ChevronRight /></button>
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

const contentTypeLabels = {
  doctor_job: '의사 초빙공고',
  medical_job: '의료인 채용공고',
  talent_profile: '인재 프로필',
  notice: '공지 · 콘텐츠',
};

const emptyContent = {
  contentType:'doctor_job', title:'', subtitle:'', status:'draft', visibility:'public',
  payload:{ primary:'', secondary:'', description:'' },
};

function ContentManager({ data, setData, mutate, qa }) {
  const [type, setType] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState(null);
  const contents = data.contents || [];
  const visible = contents.filter((item) => (type === 'all' || item.contentType === type) && (!keyword || `${item.title} ${item.subtitle}`.toLowerCase().includes(keyword.toLowerCase())));
  const openNew = () => setEditing({ ...emptyContent, payload:{ ...emptyContent.payload } });
  const openEdit = (item) => setEditing({ ...item, payload:{ ...emptyContent.payload, ...(item.payload || {}) } });
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
        <label><span>열람 권한 *</span><select value={editing.visibility} onChange={(e) => change('visibility',e.target.value)}><option value="public">전체 공개</option><option value="doctor">의사 회원</option><option value="hospital">병원 회원</option><option value="admin">관리자 전용</option></select></label>
        <label className="wide"><span>제목 *</span><input value={editing.title} onChange={(e) => change('title',e.target.value)} placeholder="공고 또는 게시글 제목" /></label>
        <label className="wide"><span>기관명·보조 제목</span><input value={editing.subtitle} onChange={(e) => change('subtitle',e.target.value)} placeholder="병원명, 공개용 후보명, 카테고리" /></label>
        <label><span>지역·주요 분류</span><input value={editing.payload.primary} onChange={(e) => changePayload('primary',e.target.value)} placeholder="예: 부산 해운대구" /></label>
        <label><span>급여·핵심 조건</span><input value={editing.payload.secondary} onChange={(e) => changePayload('secondary',e.target.value)} placeholder="예: 월 1,500만원~" /></label>
        <label className="wide"><span>상세 설명</span><textarea value={editing.payload.description} onChange={(e) => changePayload('description',e.target.value)} placeholder="근무조건, 경력, 공개 기준 등 운영에 필요한 내용을 입력하세요." /></label>
      </div>
      <footer><span><ShieldCheck /> 저장 시 관리자와 변경 시각이 자동 기록됩니다.</span><div><button className="button outline" onClick={() => setEditing(null)}>취소</button><button className="admin-primary" disabled={!editing.title.trim()} onClick={save}><Save />{editing.id ? '수정 저장' : '등록하기'}</button></div></footer>
    </div>}
    <div className="admin-content-table">
      <div className="head"><span>유형</span><span>제목·기관</span><span>공개 범위</span><span>상태</span><span>최근 수정</span><span>관리</span></div>
      {visible.map((item) => <div key={item.id}><span className={`content-kind ${item.contentType}`}>{contentTypeLabels[item.contentType]}</span><div><strong>{item.title}</strong><small>{item.subtitle || '보조 정보 없음'}</small></div><span className="content-visibility"><Eye />{{public:'전체',doctor:'의사',hospital:'병원',admin:'관리자'}[item.visibility]}</span><span className={`content-status ${item.status}`}>{{draft:'임시저장',published:'공개 중',hidden:'숨김',closed:'마감'}[item.status]}</span><time>{String(item.updatedAt || '').slice(0,16).replace('T',' ') || '-'}</time><div className="content-actions"><button onClick={() => openEdit(item)}><PencilLine />수정</button><button onClick={() => remove(item)}><Trash2 /></button></div></div>)}
      {!visible.length && <div className="admin-content-empty"><FileText /><span>조건에 맞는 운영 데이터가 없습니다.</span></div>}
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
  const rows = [['accounts', '회원 계정', metrics.accounts], ['consultation_requests', '상담 접수', metrics.consultations], ['recruitment_cases', '채용 CRM', metrics.activeCases + metrics.hiredCases], ['admin_content_records', '공고·인재·게시글', metrics.contents || 0], ['admin_categories', '운영 카테고리', metrics.categories], ['admin_audit_logs', '관리자 변경 이력', metrics.auditLogs]];
  return <section className="admin-panel"><header><div><small>DATABASE OVERVIEW</small><h2>DB 테이블 현황</h2><p>안전을 위해 임의 SQL 실행 대신 승인된 관리 기능만 제공합니다.</p></div></header><div className="admin-db-table">{rows.map(([table, label, count]) => <div key={table}><Database /><code>{table}</code><strong>{label}</strong><span>{count.toLocaleString()} records</span><em>정상</em></div>)}</div></section>;
}

function Audit({ audit = [] }) {
  return <section className="admin-panel"><header><div><small>AUDIT LOG</small><h2>관리자 변경 이력</h2><p>카테고리, 기능, 사이트 설정 변경을 추적합니다.</p></div></header><div className="admin-audit-list">{audit.map((item) => <article key={item.id}><span><Activity /></span><div><strong>{item.subject}</strong><p>{item.action}</p></div><small>{item.actor}</small><time>{item.createdAt}</time></article>)}</div></section>;
}
