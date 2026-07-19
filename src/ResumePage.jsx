import React, { useMemo, useState } from 'react';
import {
  ArrowRight, Check, ChevronLeft, ChevronRight, CircleCheck, FileText,
  LockKeyhole, ShieldCheck, Upload, UserRound
} from 'lucide-react';
import { appendStoredRecord } from './browserStorage.js';
import { withBase } from './basePath.js';

// 초간편 이력서 — 의료인 누구나(의사·간호·의료기사·약무·행정) 자유롭게 몇 줄로 작성.
// 직군도 자유 텍스트, 면허번호·술기·근무형태 선택지 없이 본인이 원하는 만큼만 적는다.
const steps = [
  { id: 'basic', label: '기본정보', icon: UserRound },
  { id: 'intro', label: '경력·소개', icon: FileText },
  { id: 'visibility', label: '공개설정', icon: LockKeyhole }
];

export default function ResumePage() {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeFileError, setResumeFileError] = useState('');
  const [dragTarget, setDragTarget] = useState('');
  const [form, setForm] = useState({
    title: '', profession: '', name: '', phone: '', email: '', region: '',
    specialty: '', desiredRegions: '', salary: '',
    introduction: '', visibility: 'proposal', consent: false
  });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const chooseResumeFile = (file) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx', 'hwp', 'hwpx'].includes(extension || '')) {
      setResumeFileError('PDF·DOC·DOCX·HWP·HWPX 파일만 등록할 수 있습니다.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setResumeFileError('이력서 파일은 10MB 이하로 등록해주세요.');
      return;
    }
    setResumeFileError('');
    setResumeFile(file);
  };
  const dropZoneProps = (target, onFiles) => ({
    onDragEnter: (event) => { event.preventDefault(); setDragTarget(target); },
    onDragOver: (event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDragTarget(target); },
    onDragLeave: (event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragTarget(''); },
    onDrop: (event) => { event.preventDefault(); setDragTarget(''); onFiles(event.dataTransfer.files); }
  });

  const completion = useMemo(() => {
    // 본인이 직접 채우는 핵심 항목만으로 완성도 계산(초간편이라 필수 최소화).
    const required = [form.title, form.profession, form.name, form.phone, form.email, form.introduction];
    return Math.round((required.filter(Boolean).length / required.length) * 100);
  }, [form]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.consent) return;
    const snapshot = {
      id: `RES-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'draft-review',
      ...form,
      resumeFileName: resumeFile?.name || ''
    };
    // 서버(D1)에 저장해 아빠(관리자)가 열람할 수 있게 한다. 서버 미가용 시 localStorage로 폴백.
    try {
      const response = await fetch(withBase('/api/resumes'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          profession: form.profession,
          specialty: form.specialty,
          name: form.name,
          phone: form.phone,
          email: form.email,
          desiredRegions: form.desiredRegions,
          completion,
          visibility: form.visibility,
          detail: { ...form }
        })
      });
      if (!response.ok) throw new Error('server save failed');
    } catch {
      appendStoredRecord('medihelpers_resumes', snapshot);
    }
    setCompleted(true);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (completed) return <main className="resume-page"><section className="resume-complete"><span><CircleCheck /></span><small>MEDICAL RESUME REGISTERED</small><h1>의료인 이력서가 등록되었습니다</h1><p>공개 범위는 <strong>{form.visibility === 'public' ? '채용기관 공개' : form.visibility === 'proposal' ? '제안 요청 시 공개' : '비공개 보관'}</strong>로 설정했습니다.<br />이름·연락처는 병원이 열람권을 결제한 경우에만 전달됩니다.</p><div><a className="button primary" href={withBase('/jobs')}>맞춤 채용정보 보기 <ArrowRight /></a><button className="button outline" onClick={() => setCompleted(false)}>이력서 수정</button></div></section></main>;

  const activeStep = steps[step].id;
  return <main className="resume-page">
    <header className="resume-hero"><div><span><FileText /> SIMPLE MEDICAL RESUME</span><h1>초간편 의료인 이력서</h1><p>의사·간호·의료기사·약무·행정 등 모든 의료인이 몇 줄이면 됩니다. 직군도 자유롭게 적고, 필요한 만큼만 채워도 등록됩니다.</p></div><div className="resume-security"><ShieldCheck /><span><strong>연락처는 열람권 결제 후에만 공개</strong><small>주민등록번호·면허번호는 받지 않습니다. 이름·연락처는 병원이 열람권을 산 경우에만 전달됩니다.</small></span></div></header>
    <form className="resume-layout" onSubmit={submit}>
      <aside className="resume-step-nav"><div className="resume-progress"><div><span>작성 완성도</span><strong>{completion}%</strong></div><i><b style={{ width: `${completion}%` }} /></i></div>{steps.map((item, index) => { const Icon = item.icon; return <button type="button" key={item.id} className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => setStep(index)}><span>{index < step ? <Check /> : <Icon />}</span><div><small>STEP {String(index + 1).padStart(2, '0')}</small><strong>{item.label}</strong></div></button>; })}<div className="resume-help"><LockKeyhole /><span><strong>공개 범위를 직접 선택</strong><small>비공개 보관부터 채용기관 공개까지 설정할 수 있습니다.</small></span></div></aside>
      <section className="resume-editor">
        {activeStep === 'basic' && <div className="resume-step-panel">
          <div className="resume-panel-head"><small>STEP 01</small><h2>기본정보</h2><p>채용기관이 가장 먼저 확인하는 정보입니다. 몇 줄이면 충분합니다.</p></div>
          <div className="resume-form-grid">
            <label className="wide"><span>이력서 제목 *</span><input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="예: 병동 간호사 · 부산경남 이직 희망" /></label>
            <label><span>의료 직군 *</span><input required value={form.profession} onChange={(e) => update('profession', e.target.value)} placeholder="예: 간호사, 의사, 방사선사, 약사, 원무" /></label>
            <label><span>전문분야·주요 업무</span><input value={form.specialty} onChange={(e) => update('specialty', e.target.value)} placeholder="예: 병동 간호, 소화기내과, MRI" /></label>
            <label><span>이름 *</span><input required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="홍길동" /></label>
            <label><span>휴대폰 *</span><input required type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="010-0000-0000" /></label>
            <label><span>이메일 *</span><input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="me@example.com" /></label>
            <label><span>현재 거주지역</span><input value={form.region} onChange={(e) => update('region', e.target.value)} placeholder="예: 부산광역시" /></label>
          </div>
          <div className="resume-safe-note"><ShieldCheck /> 이름·연락처는 익명 목록에 노출되지 않고, 병원이 열람권을 결제한 경우에만 전달됩니다.</div>
        </div>}
        {activeStep === 'intro' && <div className="resume-step-panel">
          <div className="resume-panel-head"><small>STEP 02</small><h2>경력·소개</h2><p>경력, 강점, 희망 조건을 자유롭게 한 번에 적어주세요. 형식은 자유입니다.</p></div>
          <label className="resume-intro"><span>경력·자기소개 *</span><textarea required rows="10" value={form.introduction} onChange={(e) => update('introduction', e.target.value)} placeholder={"예)\n- 부산 ○○병원 병동 간호 5년 (내과·외과)\n- 야간 근무 가능, 2026년 3월 이후 입사 가능\n- 강점: 중환자 케어, 신규 교육\n- 희망: 부산·양산권, 주 5일, 협의"} /><small>{form.introduction.length}자</small></label>
          <div className="resume-form-grid">
            <label><span>희망 근무지역</span><input value={form.desiredRegions} onChange={(e) => update('desiredRegions', e.target.value)} placeholder="예: 부산 전 지역, 경남 양산·김해" /></label>
            <label><span>희망 보수</span><input value={form.salary} onChange={(e) => update('salary', e.target.value)} placeholder="예: 협의 · 월 400만원 이상" /></label>
          </div>
          <div className={`resume-file-box ${dragTarget === 'resume' ? 'is-dragging' : ''}`} {...dropZoneProps('resume', (files) => chooseResumeFile(files?.[0]))}><div><Upload /><span><strong>기존 이력서 첨부 <i>선택</i></strong><small>있으면 그대로 첨부하세요 · PDF·DOC·DOCX·HWP·HWPX · 최대 10MB</small></span></div><label><input type="file" accept=".pdf,.doc,.docx,.hwp,.hwpx" onChange={(e) => chooseResumeFile(e.target.files?.[0])} />{resumeFile?.name || '파일 선택'}</label>{resumeFileError && <em>{resumeFileError}</em>}</div>
        </div>}
        {activeStep === 'visibility' && <div className="resume-step-panel">
          <div className="resume-panel-head"><small>STEP 03</small><h2>공개설정</h2><p>이 이력서를 어디까지 공개할지 직접 정하세요.</p></div>
          <fieldset className="resume-visibility"><legend>구직 공개 설정</legend>{[['public','구직 등록 (채용기관 공개)','병원 회원이 익명 프로필로 나를 검색할 수 있습니다. 이름·연락처는 열람권 결제 후에만 공개됩니다.'],['proposal','제안 올 때만 공개','평소엔 비공개이며, 맞는 병원 제안이 있을 때 동의를 요청합니다.'],['private','비공개 보관','목록에 올리지 않고, 내가 직접 지원할 때만 전달합니다.']].map(([value,title,copy]) => <label key={value} className={form.visibility === value ? 'active' : ''}><input type="radio" name="visibility" value={value} checked={form.visibility === value} onChange={(e) => update('visibility', e.target.value)} /><span><strong>{title}</strong><small>{copy}</small></span>{form.visibility === value && <Check />}</label>)}</fieldset>
          <label className="resume-consent"><input type="checkbox" checked={form.consent} onChange={(e) => update('consent', e.target.checked)} /><span>이력서 등록과 채용 매칭을 위한 개인정보 수집·이용에 동의합니다.</span></label>
        </div>}
        <div className="resume-step-actions"><button type="button" className="button outline" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}><ChevronLeft /> 이전</button>{step < steps.length - 1 ? <button type="button" className="button primary" onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>다음 단계 <ChevronRight /></button> : <button type="submit" className="button primary" disabled={!form.consent}>이력서 등록하기 <ArrowRight /></button>}</div>
      </section>
      <aside className="resume-preview"><small>LIVE PREVIEW</small><div className="resume-preview-avatar"><UserRound /></div><h3>{form.title || '이력서 제목을 입력해주세요'}</h3><span className="resume-preview-role">{form.profession || '직군 미입력'}{form.specialty ? ` · ${form.specialty}` : ''}</span><dl><div><dt>희망 지역</dt><dd>{form.desiredRegions || form.region || '미입력'}</dd></div><div><dt>희망 보수</dt><dd>{form.salary || '협의'}</dd></div></dl><div className="resume-preview-privacy"><LockKeyhole /><span><strong>이름·연락처 비공개</strong><small>병원이 열람권을 결제한 경우에만 공개됩니다.</small></span></div></aside>
    </form>
  </main>;
}
