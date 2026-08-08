import React, { useEffect, useState } from 'react';
import { Check, FilePlus2, FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { withBase } from './basePath.js';

export default function ResumeSubmitPicker({ selectedId, onSelect, onLoaded, optional = true }) {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(withBase('/api/resumes'), { credentials:'same-origin', headers:{ accept:'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.error || '이력서를 불러오지 못했습니다.');
        return response.json();
      })
      .then((result) => {
        if (!active) return;
        const list = Array.isArray(result?.resumes) ? result.resumes : result?.resume ? [result.resume] : [];
        setResumes(list);
        onLoaded?.(list);
        if (!selectedId && list[0]?.id) onSelect(list[0].id);
      })
      .catch((reason) => { if (active) setError(reason.message || '이력서를 불러오지 못했습니다.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <section className="resume-submit-picker" aria-labelledby="resume-submit-picker-title">
    <header>
      <span className="resume-picker-icon"><FileText /></span>
      <div><small>MY RESUME</small><h3 id="resume-submit-picker-title">등록 이력서 선택</h3><p>홈페이지에 저장한 이력서 중 이번 상담·지원에 제출할 이력서를 고르세요.</p></div>
      <a href={withBase('/resume?new=1')}><FilePlus2 /> 새 이력서 작성</a>
    </header>
    {loading && <div className="resume-picker-state"><RefreshCw className="spin" /> 등록 이력서를 불러오는 중입니다…</div>}
    {!loading && error && <div className="resume-picker-state error">{error}</div>}
    {!loading && !error && resumes.length === 0 && <div className="resume-picker-empty"><FilePlus2 /><div><strong>아직 등록한 이력서가 없습니다</strong><p>한 번 작성해두면 다음 상담과 지원부터 선택만 하면 됩니다.</p></div><a href={withBase('/resume?new=1')}>이력서 작성하기</a></div>}
    {!loading && resumes.length > 0 && <div className="resume-picker-list" role="radiogroup" aria-label="제출할 이력서">
      {optional && <button type="button" className={!selectedId ? 'selected' : ''} onClick={() => onSelect('')} role="radio" aria-checked={!selectedId}><span className="resume-radio">{!selectedId && <Check />}</span><div><strong>이번에는 첨부하지 않기</strong><small>상담 내용만 먼저 접수합니다.</small></div></button>}
      {resumes.map((resume) => <button type="button" key={resume.id} className={selectedId === resume.id ? 'selected' : ''} onClick={() => onSelect(resume.id)} role="radio" aria-checked={selectedId === resume.id}>
        <span className="resume-radio">{selectedId === resume.id && <Check />}</span>
        <div><strong>{resume.title || '내 이력서'}</strong><small>{[resume.profession, resume.specialty, resume.desiredRegions].filter(Boolean).join(' · ') || '상세정보 확인'}</small><em>완성도 {Number(resume.completion) || 0}% · {resume.visibility === 'private' ? '직접 제출 시만 공개' : '제안용'}</em></div>
      </button>)}
    </div>}
    <footer><ShieldCheck /> 선택한 이력서는 로그인한 본인 소유인지 서버에서 확인하며, 접수 당시 내용으로 안전하게 보존됩니다.<a href={withBase('/resume')}>내 이력서 관리</a></footer>
  </section>;
}
