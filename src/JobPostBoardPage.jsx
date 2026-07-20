import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Building2, CalendarDays, Check, CircleCheck, Eye, EyeOff,
  FileText, MapPin, PencilLine, Plus, Save, Stethoscope, Trash2, UsersRound, X
} from 'lucide-react';
import { withBase } from './basePath.js';

// 아빠(헤드헌터·관리자) 전용 공고 게시판.
// 관리자 콘솔의 복잡한 통합 관리 대신, "공고 올리기 + 내가 올린 공고 관리"만 담은 간편 전용 페이지.
// 기존 /api/admin-console 의 content_create/update/delete 를 그대로 사용해 /jobs·/medical-staff 에 노출된다.

// 노출 위치: 두 유형 모두 맞춤 헤드헌팅의 '의사 초빙 정보란'(HeadhuntBoard)에 게시된다.
// doctor_job은 추가로 의사 채용(/jobs) 목록에도 노출된다. (/medical-staff는 구직 게시판 전용으로 바뀌어 공고 목록 없음)
const POST_TYPES = [
  { key: 'doctor_job', label: '의사 채용공고', icon: Stethoscope, hint: '봉직의·원장·검진 등 의사 초빙공고 (초빙 정보란 + 의사 채용 목록에 노출)', target: '/headhunting' },
  { key: 'medical_job', label: '의료인 채용공고', icon: UsersRound, hint: '간호·의료기사·약무 등 의료인 초빙공고 (초빙 정보란에 노출)', target: '/headhunting' },
];

const emptyPost = () => ({
  contentType: 'doctor_job', title: '', subtitle: '', status: 'published', visibility: 'public',
  payload: { primary: '', region: '', department: '', role: '', employmentType: '', career: '', pay: '', deadline: '상시채용', schedule: '', description: '' },
});

function go(path) {
  window.history.pushState({}, '', withBase(path));
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'auto' });
}

async function callConsole(action, payload) {
  const response = await fetch('/api/admin-console', {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || '저장하지 못했습니다. 관리자 로그인 상태인지 확인해 주세요.');
  return body;
}

async function loadConsole() {
  const response = await fetch('/api/admin-console', { credentials: 'same-origin', headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('unauthorized');
  return response.json();
}

const typeLabel = (t) => POST_TYPES.find((x) => x.key === t)?.label || '공고';
const statusLabel = { draft: '임시저장', published: '공개 중', hidden: '숨김', closed: '마감' };

export default function JobPostBoardPage() {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(true);
  const [contents, setContents] = useState([]);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    try {
      const data = await loadConsole();
      // 아빠가 올린 채용공고만(의사/의료인), 최신순.
      const jobs = (data.contents || []).filter((c) => c.contentType === 'doctor_job' || c.contentType === 'medical_job');
      setContents(jobs);
      setAuthorized(true);
    } catch {
      setAuthorized(false);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    document.title = '공고 올리기 | 메디헬퍼스 관리자';
    refresh();
    return () => { document.title = '메디헬퍼스 | 의사 구인구직·전문 헤드헌팅'; };
  }, []);

  const change = (key, value) => setEditing((old) => ({ ...old, [key]: value }));
  const changePayload = (key, value) => setEditing((old) => ({ ...old, payload: { ...old.payload, [key]: value } }));

  const openNew = () => { setMessage(''); setEditing(emptyPost()); };
  const openEdit = (item) => {
    setMessage('');
    setEditing({ ...item, payload: { ...emptyPost().payload, ...(item.payload || {}) } });
  };

  const save = async (publish) => {
    if (!editing?.title.trim()) { setMessage('공고 제목을 입력해 주세요.'); return; }
    if (!editing?.subtitle.trim()) { setMessage('병원·기관명을 입력해 주세요.'); return; }
    setSaving(true);
    setMessage('');
    const isUpdate = Boolean(editing.id);
    const record = {
      ...editing,
      title: editing.title.trim(),
      subtitle: editing.subtitle.trim(),
      status: publish ? 'published' : 'draft',
      visibility: 'public',
      sortOrder: 0,
      // department/role 동기화(의사=진료과, 의료인=직군 같은 값 사용)
      payload: { ...editing.payload, department: editing.payload.department || editing.payload.role, role: editing.payload.role || editing.payload.department },
    };
    try {
      await callConsole(isUpdate ? 'content_update' : 'content_create', record);
      setMessage(publish ? '✅ 공고를 게시했습니다. 사이트에 바로 노출됩니다.' : '임시저장했습니다.');
      setEditing(null);
      await refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleHidden = async (item) => {
    const next = item.status === 'published' ? 'hidden' : 'published';
    setSaving(true);
    try {
      await callConsole('content_update', { ...item, status: next, visibility: item.visibility || 'public', payload: item.payload || {} });
      setMessage(next === 'published' ? '공고를 다시 공개했습니다.' : '공고를 숨겼습니다.');
      await refresh();
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  };

  const remove = async (item) => {
    if (!window.confirm(`‘${item.title}’ 공고를 삭제할까요? 삭제 후 복구할 수 없습니다.`)) return;
    setSaving(true);
    try {
      await callConsole('content_delete', { id: item.id });
      setMessage('공고를 삭제했습니다.');
      await refresh();
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  };

  const publishedCount = useMemo(() => contents.filter((c) => c.status === 'published').length, [contents]);

  if (!ready) return <div className="post-board"><div className="post-board-loading"><FileText /> 불러오는 중…</div></div>;

  if (!authorized) return <div className="post-board"><section className="post-board-gate">
    <Building2 />
    <h1>관리자 전용 공고 게시판</h1>
    <p>공고를 올리려면 메디헬퍼스 <b>관리자 계정</b>으로 로그인해야 합니다.</p>
    <a className="button primary" href={withBase(`/login?next=${encodeURIComponent('/admin/post')}`)}>관리자 로그인 <ArrowRight /></a>
  </section></div>;

  return <div className="post-board">
    <header className="post-board-hero">
      <button className="post-board-back" onClick={() => go('/admin')}><ArrowLeft /> 관리자 콘솔</button>
      <div>
        <span className="post-board-kicker"><FileText /> JOB POSTING</span>
        <h1>공고 올리기</h1>
        <p>의사·의료인 채용공고를 직접 올리면 <b>채용정보 페이지에 바로 노출</b>됩니다. 공고를 본 병원·의사가 상담을 신청하면 관리자 상담함과 알림(설정 시 이메일·문자)으로 접수됩니다.</p>
      </div>
      <div className="post-board-stat"><strong>{publishedCount}</strong><small>공개 중인 공고</small></div>
    </header>

    {message && <div className={`post-board-toast ${message.startsWith('✅') ? 'ok' : ''}`}>{message}</div>}

    {!editing && <div className="post-board-actions">
      <button className="button primary" onClick={openNew}><Plus /> 새 공고 올리기</button>
    </div>}

    {editing && <section className="post-board-editor">
      <header>
        <h2>{editing.id ? '공고 수정' : '새 공고 작성'}</h2>
        <button className="icon-button" onClick={() => setEditing(null)} aria-label="닫기"><X /></button>
      </header>

      <div className="post-type-picker">
        {POST_TYPES.map((t) => {
          const Icon = t.icon;
          return <button
            key={t.key}
            type="button"
            className={editing.contentType === t.key ? 'active' : ''}
            onClick={() => change('contentType', t.key)}
          >
            <Icon /><strong>{t.label}</strong><small>{t.hint}</small>
          </button>;
        })}
      </div>

      <div className="post-form">
        <label className="wide"><span>공고 제목 *</span><input value={editing.title} onChange={(e) => change('title', e.target.value)} placeholder="예: 정형외과 봉직의 초빙 (주 4.5일)" /></label>
        <label className="wide"><span>병원·기관명 *</span><input value={editing.subtitle} onChange={(e) => change('subtitle', e.target.value)} placeholder="예: 부산 해운대 튼튼정형외과의원" /></label>
        <label><span>{editing.contentType === 'doctor_job' ? '진료과' : '직군'}</span><input value={editing.payload.department || editing.payload.role || ''} onChange={(e) => { changePayload('department', e.target.value); changePayload('role', e.target.value); }} placeholder={editing.contentType === 'doctor_job' ? '예: 정형외과' : '예: 간호사, 방사선사'} /></label>
        <label><span>근무 지역</span><input value={editing.payload.region || editing.payload.primary || ''} onChange={(e) => { changePayload('region', e.target.value); changePayload('primary', e.target.value); }} placeholder="예: 부산 해운대구" /></label>
        <label><span>급여·보수</span><input value={editing.payload.pay || ''} onChange={(e) => changePayload('pay', e.target.value)} placeholder="예: 월 1,500만원~ (협의)" /></label>
        <label><span>고용 형태</span><input value={editing.payload.employmentType || ''} onChange={(e) => changePayload('employmentType', e.target.value)} placeholder="예: 정규직, 주 4.5일" /></label>
        <label><span>경력 조건</span><input value={editing.payload.career || ''} onChange={(e) => changePayload('career', e.target.value)} placeholder="예: 전문의, 경력무관" /></label>
        <label><span>마감일</span><input value={editing.payload.deadline || ''} onChange={(e) => changePayload('deadline', e.target.value)} placeholder="예: 2026.08.31, 상시채용" /></label>
        <label className="wide"><span>근무 일정</span><input value={editing.payload.schedule || ''} onChange={(e) => changePayload('schedule', e.target.value)} placeholder="예: 평일 09:00~18:00 · 토요일 격주 오전" /></label>
        <label className="wide"><span>상세 설명</span><textarea rows={5} value={editing.payload.description} onChange={(e) => changePayload('description', e.target.value)} placeholder="근무조건, 복리후생, 우대사항, 지원 방법 등 병원·의사에게 알리고 싶은 내용을 자유롭게 적어주세요." /></label>
      </div>

      <footer>
        <button className="button outline" onClick={() => save(false)} disabled={saving}>임시저장</button>
        <button className="button primary" onClick={() => save(true)} disabled={saving}><Save /> {saving ? '올리는 중…' : (editing.id ? '수정 후 게시' : '공고 게시하기')}</button>
      </footer>
    </section>}

    {!editing && <section className="post-board-list">
      <header><h2>내가 올린 공고 <b>{contents.length}</b></h2></header>
      {!contents.length && <div className="post-board-empty">
        <FileText />
        <strong>아직 올린 공고가 없습니다</strong>
        <p>“새 공고 올리기”를 눌러 첫 채용공고를 등록해 보세요.</p>
      </div>}
      {contents.map((item) => <article key={item.id} className="post-card">
        <div className="post-card-main">
          <span className={`post-card-type ${item.contentType}`}>{typeLabel(item.contentType)}</span>
          <h3>{item.title}</h3>
          <p><Building2 /> {item.subtitle || '기관명 미입력'}{item.payload?.region ? <> · <MapPin /> {item.payload.region}</> : null}</p>
          <div className="post-card-meta">
            {item.payload?.pay && <span>{item.payload.pay}</span>}
            {item.payload?.deadline && <span><CalendarDays /> {item.payload.deadline}</span>}
            <span className={`post-card-status ${item.status}`}>{statusLabel[item.status] || item.status}</span>
          </div>
        </div>
        <div className="post-card-actions">
          <button onClick={() => go(item.contentType === 'doctor_job' ? '/jobs' : '/headhunting')} title="사이트에서 보기"><Eye /> 사이트 보기</button>
          <button onClick={() => openEdit(item)}><PencilLine /> 수정</button>
          <button onClick={() => toggleHidden(item)}>{item.status === 'published' ? <><EyeOff /> 숨기기</> : <><Check /> 공개</>}</button>
          <button className="post-card-delete" onClick={() => remove(item)}><Trash2 /> 삭제</button>
        </div>
      </article>)}
    </section>}
  </div>;
}
