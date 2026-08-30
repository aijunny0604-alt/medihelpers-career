import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CircleCheck, Eye, EyeOff, FileText, Link2, Trash2, TriangleAlert } from 'lucide-react';
import { withBase } from './basePath.js';
import { invalidateSiteOperations } from './siteOperations.js';

function go(path) {
  window.history.pushState({}, '', withBase(path));
  window.dispatchEvent(new PopStateEvent('popstate'));
}

const emptyForm = {
  resumeId: '', title: '', specialty: '', desiredRegion: '', availableFrom: '협의',
  employmentType: '', summary: '', contactVisibility: 'private',
};

export default function JobSeekerPostPage({ postId = '' }) {
  const editing = Boolean(postId);
  const [resumes, setResumes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(withBase('/api/resumes'), { credentials:'same-origin', headers:{ accept:'application/json' } }),
      editing ? fetch(withBase(`/api/job-seeker-posts/${encodeURIComponent(postId)}`), { credentials:'same-origin', headers:{ accept:'application/json' } }) : Promise.resolve(null),
    ]).then(async ([resumeResponse, postResponse]) => {
      const resumeData = await resumeResponse.json().catch(() => ({}));
      if (!resumeResponse.ok) throw new Error(resumeData.error || '이력서를 불러오지 못했습니다.');
      const postData = postResponse ? await postResponse.json().catch(() => ({})) : null;
      if (postResponse && !postResponse.ok) throw new Error(postData?.error || '구직글을 불러오지 못했습니다.');
      if (!active) return;
      const nextResumes = resumeData.resumes || [];
      setResumes(nextResumes);
      const post = postData?.post;
      if (post) setForm({ ...emptyForm, ...post });
      else if (nextResumes[0]) {
        const resume = nextResumes[0];
        setForm((current) => ({
          ...current,
          resumeId: resume.id,
          title: resume.specialty ? `${resume.specialty} · 구직 중` : resume.title || '',
          specialty: resume.specialty || resume.profession || '',
          desiredRegion: resume.desiredRegions || '',
          availableFrom: resume.detail?.available || '협의',
          employmentType: Array.isArray(resume.detail?.workTypes) ? resume.detail.workTypes.join(' · ') : resume.detail?.workTypes || '',
          summary: resume.detail?.introduction || '',
        }));
      }
    }).catch((error) => { if (active) { setFailed(true); setMessage(error.message); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [editing, postId]);

  const selectedResume = useMemo(() => resumes.find((resume) => resume.id === form.resumeId), [resumes, form.resumeId]);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const chooseResume = (resume) => setForm((current) => ({
    ...current,
    resumeId: resume.id,
    specialty: current.specialty || resume.specialty || resume.profession || '',
    desiredRegion: current.desiredRegion || resume.desiredRegions || '',
  }));

  const save = async (event) => {
    event.preventDefault();
    if (!form.resumeId || !form.title.trim()) { setFailed(true); setMessage('연동할 이력서와 구직글 제목을 확인해주세요.'); return; }
    setBusy(true); setMessage(''); setFailed(false);
    try {
      const response = await fetch(withBase(editing ? `/api/job-seeker-posts/${encodeURIComponent(postId)}` : '/api/job-seeker-posts'), {
        method: editing ? 'PATCH' : 'POST', credentials:'same-origin', headers:{ 'content-type':'application/json' }, body:JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || '구직글을 저장하지 못했습니다.');
      invalidateSiteOperations();
      setMessage(editing ? '구직글을 수정했습니다.' : '구직글을 등록했습니다.');
      window.setTimeout(() => go('/medical-staff'), 500);
    } catch (error) { setFailed(true); setMessage(error.message); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!editing || !window.confirm('이 구직글을 삭제할까요? 연결된 이력서는 삭제되지 않습니다.')) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(withBase(`/api/job-seeker-posts/${encodeURIComponent(postId)}`), { method:'DELETE', credentials:'same-origin' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || '구직글을 삭제하지 못했습니다.');
      invalidateSiteOperations();
      go('/mypage?tab=resume');
    } catch (error) { setFailed(true); setMessage(error.message); setBusy(false); }
  };

  if (loading) return <main className="job-seeker-editor"><section className="job-seeker-editor-state">구직글 정보를 불러오는 중입니다.</section></main>;
  if (!resumes.length && !failed) return <main className="job-seeker-editor"><section className="job-seeker-editor-state"><FileText /><h1>먼저 이력서를 작성해주세요</h1><p>구직글에는 저장된 이력서를 하나 연결합니다. 이력서를 저장해도 자동 게시되지 않으며, 작성 후 이 화면으로 돌아와 직접 등록합니다.</p><div><button className="button primary" onClick={() => go(`/resume?new=1&next=${encodeURIComponent('/job-seeker-posts/new')}`)}>이력서 작성 <ArrowRight /></button><button className="button outline" onClick={() => go('/medical-staff')}><ArrowLeft /> 목록으로</button></div></section></main>;

  return <main className="job-seeker-editor">
    <div className="job-seeker-editor-shell">
      <button type="button" className="job-seeker-editor-back" onClick={() => go('/medical-staff')}><ArrowLeft /> 구직 인재 목록</button>
      <header><small>MY JOB SEEKER POST</small><h1>{editing ? '내 구직글 수정' : '새 구직글 등록'}</h1><p>게시글은 이력서와 별도로 작성하고, 저장해둔 이력서 하나를 연결해 경력 정보를 활용합니다.</p></header>
      {message && <div className={`job-seeker-editor-message ${failed ? 'error' : 'success'}`}>{failed ? <TriangleAlert /> : <CircleCheck />} {message}</div>}
      <form onSubmit={save}>
        <section className="job-seeker-editor-card"><div className="job-seeker-editor-heading"><span><Link2 /></span><div><h2>연동 이력서 선택</h2><p>아래 저장된 이력서 중 하나를 반드시 선택합니다. 게시글을 수정해도 원본 이력서는 별도로 안전하게 관리됩니다.</p></div><a href={withBase(`/resume?next=${encodeURIComponent(editing ? `/job-seeker-posts/${postId}/edit` : '/job-seeker-posts/new')}`)} className="button outline">이력서 관리</a></div>
          <div className="job-seeker-resume-list">{resumes.map((resume) => <button type="button" key={resume.id} className={form.resumeId === resume.id ? 'selected' : ''} onClick={() => chooseResume(resume)}><span>{form.resumeId === resume.id ? <CircleCheck /> : <FileText />}</span><div><strong>{resume.title || '내 이력서'}</strong><small>{[resume.profession, resume.specialty, `완성도 ${resume.completion || 0}%`].filter(Boolean).join(' · ')}</small></div></button>)}</div>
          {selectedResume && <p className="job-seeker-linked-note"><BriefcaseBusiness /> 현재 연결: <strong>{selectedResume.title || selectedResume.specialty || '내 이력서'}</strong></p>}
        </section>

        <section className="job-seeker-editor-card"><div className="job-seeker-editor-heading"><span><FileText /></span><div><h2>게시글 내용</h2><p>병원이 목록에서 빠르게 이해할 수 있는 정보만 간단히 입력해주세요.</p></div></div>
          <div className="job-seeker-editor-grid"><label className="wide"><span>구직글 제목 <em>필수</em></span><input value={form.title} onChange={update('title')} placeholder="예: 소화기내과 전문의 · 부산권 구직" /></label><label><span>진료과·직군</span><input value={form.specialty} onChange={update('specialty')} /></label><label><span>희망 지역</span><input value={form.desiredRegion} onChange={update('desiredRegion')} /></label><label><span>입사 가능 시점</span><input value={form.availableFrom} onChange={update('availableFrom')} placeholder="예: 협의, 1개월 내" /></label><label><span>희망 근무 형태</span><input value={form.employmentType} onChange={update('employmentType')} placeholder="예: 봉직의 · 주 5일" /></label><label className="wide"><span>간단한 소개</span><textarea rows="5" value={form.summary} onChange={update('summary')} placeholder="강점과 희망 조건을 간단히 적어주세요." /></label></div>
        </section>

        <section className="job-seeker-editor-card"><div className="job-seeker-editor-heading"><span><EyeOff /></span><div><h2>연락처 공개 여부</h2><p>병원이 이력서 열람권을 구매해도 이 설정을 넘을 수 없습니다.</p></div></div>
          <div className="job-seeker-contact-options"><label className={form.contactVisibility === 'private' ? 'selected' : ''}><input type="radio" name="contactVisibility" value="private" checked={form.contactVisibility === 'private'} onChange={update('contactVisibility')} /><EyeOff /><span><strong>연락처 비공개</strong><small>열람권을 구매한 병원에도 전화·이메일을 공개하지 않습니다.</small></span></label><label className={form.contactVisibility === 'ticket' ? 'selected' : ''}><input type="radio" name="contactVisibility" value="ticket" checked={form.contactVisibility === 'ticket'} onChange={update('contactVisibility')} /><Eye /><span><strong>열람권 구매 병원에 공개</strong><small>유효한 열람권을 사용한 병원에게만 연락처를 공개합니다.</small></span></label></div>
        </section>

        <footer className="job-seeker-editor-actions"><div><button type="button" className="button outline" onClick={() => go('/medical-staff')}><ArrowLeft /> 취소</button>{editing && <button type="button" className="button danger" onClick={remove} disabled={busy}><Trash2 /> 구직글 삭제</button>}</div><button type="submit" className="button primary" disabled={busy}>{busy ? '저장 중…' : editing ? '수정 내용 저장' : '구직글 등록'} <ArrowRight /></button></footer>
      </form>
    </div>
  </main>;
}
