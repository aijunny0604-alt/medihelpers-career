import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Camera, Check, ChevronLeft, ChevronRight, CircleCheck, FileText,
  ImagePlus, LockKeyhole, ShieldCheck, Trash2, UserRound
} from 'lucide-react';
import { appendStoredRecord } from './browserStorage.js';
import { withBase } from './basePath.js';
import { uploadResumePhoto, validateResumePhoto } from './resumePhotoUpload.js';
import { dropImageFiles, pasteImageFiles } from './imageInput.js';
import { invalidateSiteOperations } from './siteOperations.js';

// 초간편 이력서 — 의료인 누구나(의사·간호·의료기사·약무·행정) 자유롭게 몇 줄로 작성.
// 직군도 자유 텍스트, 면허번호·술기·근무형태 선택지 없이 본인이 원하는 만큼만 적는다.
const steps = [
  { id: 'basic', label: '기본정보', icon: UserRound },
  { id: 'intro', label: '경력·소개', icon: FileText },
  { id: 'visibility', label: '공개설정', icon: LockKeyhole }
];

export default function ResumePage() {
  const createNew = (() => { try { return new URLSearchParams(window.location.search).get('new') === '1'; } catch { return false; } })();
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingResume, setLoadingResume] = useState(!createNew);
  const [submitError, setSubmitError] = useState('');
  const [savedResumeId, setSavedResumeId] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoDragging, setPhotoDragging] = useState(false);
  const [form, setForm] = useState({
    title: '', profession: '', name: '', phone: '', email: '', region: '', photoUrl: '',
    specialty: '', desiredRegions: '', salary: '',
    // 이 화면의 진입점이 '구직글 등록'이므로 기본값은 구직 게시판에 노출되는 public.
    // (기본이 proposal이면 등록해도 목록에 안 떠서 "등록이 안 된다"로 오해된다.
    //  연락처는 여전히 기본 비공개라 개인정보는 그대로 보호된다.)
    introduction: '', visibility: 'public', contactVisibility: 'private', consent: false
  });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (createNew) {
      setLoadingResume(false);
      return undefined;
    }
    let active = true;
    fetch(withBase('/api/resumes'), {
      credentials: 'same-origin',
      headers: { accept: 'application/json' }
    })
      .then(async (response) => {
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.error || '저장된 이력서를 불러오지 못했습니다.');
        }
        return response.json();
      })
      .then((result) => {
        if (!active) return;
        const resume = result?.resume || result?.resumes?.[0];
        if (!resume) return;
        const detail = resume.detail && typeof resume.detail === 'object' ? resume.detail : {};
        setSavedResumeId(resume.id || '');
        setForm((current) => ({
          ...current,
          title: resume.title || '',
          profession: resume.profession || '',
          specialty: resume.specialty || '',
          name: resume.name || '',
          phone: resume.phone || '',
          email: resume.email || '',
          desiredRegions: resume.desiredRegions || '',
          visibility: resume.visibility || 'proposal',
          contactVisibility: detail.contactVisibility === 'ticket' ? 'ticket' : 'private',
          region: detail.region || '',
          salary: detail.salary || '',
          introduction: detail.introduction || '',
          photoUrl: detail.photoUrl || '',
          consent: false
        }));
      })
      .catch((error) => {
        if (active) setSubmitError(error?.message || '저장된 이력서를 불러오지 못했습니다.');
      })
      .finally(() => { if (active) setLoadingResume(false); });
    return () => { active = false; };
  }, [createNew]);

  useEffect(() => () => { if (photoPreview && photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  const choosePhotoFile = (file, input) => {
    if (!file) return;
    const error = validateResumePhoto(file);
    if (error) { setSubmitError(error); if (input) input.value = ''; return; }
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setSubmitError('');
  };
  const choosePhoto = (event) => choosePhotoFile(event.target.files?.[0] || null, event.target);
  const removePhoto = () => {
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null); setPhotoPreview(''); update('photoUrl', '');
  };

  const completion = useMemo(() => {
    // 본인이 직접 채우는 핵심 항목만으로 완성도 계산(초간편이라 필수 최소화).
    const required = [form.title, form.profession, form.name, form.phone, form.email, form.introduction];
    return Math.round((required.filter(Boolean).length / required.length) * 100);
  }, [form]);

  const submit = async (event) => {
    event.preventDefault();
    // 동의를 안 하면 예전에는 조용히 return 해서 "등록 버튼이 안 먹는다"로 보였다.
    // 이유를 알려주고 동의 항목으로 이동시킨다.
    if (!form.consent) {
      setSubmitError('개인정보 수집·이용 동의에 체크해야 이력서를 등록할 수 있습니다.');
      window.requestAnimationFrame(() => {
        const box = document.querySelector('input[type="checkbox"][name="consent"], .resume-consent input[type="checkbox"], input[type="checkbox"]');
        if (box) {
          box.scrollIntoView({ behavior: 'smooth', block: 'center' });
          try { box.focus({ preventScroll: true }); } catch { box.focus(); }
        }
      });
      return;
    }
    const snapshot = {
      id: `RES-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'draft-review',
      ...form
    };
    // 서버(D1)에 저장해 아빠(관리자)가 열람할 수 있게 한다.
    // 예전에는 서버가 401·403·413을 돌려줘도 catch에서 조용히 삼키고 무조건 완료 화면을 띄웠다.
    // 의사 입장에서는 이력서가 등록된 줄 알지만 실제로는 저장되지 않아 제안을 못 받는다.
    setSubmitting(true);
    setSubmitError('');
    try {
      const photoUrl = photoFile ? await uploadResumePhoto(photoFile) : form.photoUrl;
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
          contactVisibility: form.contactVisibility,
          ...(savedResumeId ? { resumeId:savedResumeId } : createNew ? { createNew:true } : {}),
          detail: { region:form.region, salary:form.salary, introduction:form.introduction, photoUrl, contactVisibility:form.contactVisibility }
        })
      });
      if (!response.ok) {
        // 서버가 이유를 알려주면 그대로 보여준다(로그인 필요·회원유형·용량 초과 등).
        let message = '';
        try { message = (await response.json())?.error || ''; } catch {}
        setSubmitError(message || '이력서를 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        setSubmitting(false);
        return;
      }
      const result = await response.json().catch(() => ({}));
      if (result.id) setSavedResumeId(result.id);
      if (photoUrl) update('photoUrl', photoUrl);
    } catch (error) {
      // 실제 네트워크 단절일 때만 임시 보관한다. 사진 형식·권한 오류를 저장 성공처럼 처리하지 않는다.
      if (error instanceof TypeError) appendStoredRecord('medihelpers_resumes', snapshot);
      setSubmitError(error?.message || '이력서와 프로필 사진을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    // 구직 공개(visibility=public)로 등록하면 인재 목록이 바뀐다.
    // 캐시를 버려야 의료인 구인구직 페이지로 이동했을 때 방금 올린 글이 바로 보인다.
    invalidateSiteOperations();
    setCompleted(true);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (completed) return <main className="resume-page"><section className="resume-complete"><span><CircleCheck /></span><small>MEDICAL RESUME REGISTERED</small><h1>의료인 이력서가 등록되었습니다</h1><p>공개 범위는 <strong>{form.visibility === 'public' ? '채용기관 공개' : form.visibility === 'proposal' ? '제안 요청 시 공개' : '비공개 보관'}</strong>로 설정했습니다.<br />연락처는 <strong>{form.contactVisibility === 'ticket' ? '열람권을 구매한 병원에 공개' : '열람권 구매와 관계없이 비공개'}</strong>로 보호됩니다.</p><div><a className="button primary" href={withBase('/jobs')}>맞춤 채용정보 보기 <ArrowRight /></a><button className="button outline" onClick={() => setCompleted(false)}>이력서 수정</button></div></section></main>;

  if (loadingResume) return <main className="resume-page"><section className="resume-complete"><span><FileText /></span><small>MY RESUME</small><h1>저장된 이력서를 불러오는 중입니다</h1><p>다른 기기에서 등록한 최신 이력서를 안전하게 확인하고 있습니다.</p></section></main>;

  const activeStep = steps[step].id;
  return <main className="resume-page">
    <header className="resume-hero"><div><span><FileText /> SIMPLE MEDICAL RESUME</span><h1>초간편 의료인 이력서</h1><p>의사·간호·의료기사·약무·행정 등 모든 의료인이 몇 줄이면 됩니다. 직군도 자유롭게 적고, 필요한 만큼만 채워도 등록됩니다.</p></div><div className="resume-security"><ShieldCheck /><span><strong>연락처 공개 여부는 본인이 결정</strong><small>비공개를 선택하면 병원이 이력서 열람권을 구매해도 전화번호와 이메일은 전달되지 않습니다.</small></span></div></header>
    <form className="resume-layout" onSubmit={submit}>
      <aside className="resume-step-nav"><div className="resume-progress"><div><span>작성 완성도</span><strong>{completion}%</strong></div><i><b style={{ width: `${completion}%` }} /></i></div>{steps.map((item, index) => { const Icon = item.icon; return <button type="button" key={item.id} className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => setStep(index)}><span>{index < step ? <Check /> : <Icon />}</span><div><small>STEP {String(index + 1).padStart(2, '0')}</small><strong>{item.label}</strong></div></button>; })}<div className="resume-help"><LockKeyhole /><span><strong>공개 범위를 직접 선택</strong><small>비공개 보관부터 채용기관 공개까지 설정할 수 있습니다.</small></span></div></aside>
      <section className="resume-editor">
        {activeStep === 'basic' && <div className="resume-step-panel">
          <div className="resume-panel-head"><small>STEP 01</small><h2>기본정보</h2><p>채용기관이 가장 먼저 확인하는 정보입니다. 몇 줄이면 충분합니다.</p></div>
          <div
            className={`resume-photo-upload-card ${photoDragging ? 'is-dragging' : ''}`}
            tabIndex="0"
            aria-label="증명사진 업로드: 클릭, 드래그 또는 붙여넣기"
            onDragEnter={(event) => { event.preventDefault(); setPhotoDragging(true); }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setPhotoDragging(true); }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPhotoDragging(false); }}
            onDrop={(event) => { setPhotoDragging(false); dropImageFiles(event, (files) => choosePhotoFile(files[0])); }}
            onPaste={(event) => pasteImageFiles(event, (files) => choosePhotoFile(files[0]))}
          >
            <div className={`resume-photo-preview ${photoPreview || form.photoUrl ? 'has-photo' : ''}`}>{photoPreview || form.photoUrl ? <img src={photoPreview || withBase(form.photoUrl)} alt="이력서 프로필 사진 미리보기" /> : <UserRound />}</div>
            <div className="resume-photo-copy"><span><Camera /> 증명사진·프로필 사진 <i>선택</i></span><strong>클릭하거나 사진을 끌어 놓고, 복사한 이미지는 Ctrl+V로 붙여넣으세요</strong><small>JPG·PNG·WEBP · 최대 5MB · 정사각형 또는 세로 사진 권장</small><div><label><ImagePlus /> 사진 선택<input type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} /></label>{(photoPreview || form.photoUrl) && <button type="button" onClick={removePhoto}><Trash2 /> 삭제</button>}</div></div>
          </div>
          <div className="resume-form-grid">
            <label className="wide"><span>이력서 제목 *</span><input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="예: 병동 간호사 · 부산경남 이직 희망" /></label>
            <label><span>의료 직군 *</span><input required value={form.profession} onChange={(e) => update('profession', e.target.value)} placeholder="예: 간호사, 의사, 방사선사, 약사, 원무" /></label>
            <label><span>전문분야·주요 업무</span><input value={form.specialty} onChange={(e) => update('specialty', e.target.value)} placeholder="예: 병동 간호, 소화기내과, MRI" /></label>
            <label><span>이름 *</span><input required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="홍길동" /></label>
            <label><span>휴대폰 *</span><input required type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="010-0000-0000" /></label>
            <label><span>이메일 *</span><input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="me@example.com" /></label>
            <label><span>현재 거주지역</span><input value={form.region} onChange={(e) => update('region', e.target.value)} placeholder="예: 부산광역시" /></label>
          </div>
          <div className="resume-safe-note"><ShieldCheck /> 이름·연락처는 익명 목록에 노출되지 않습니다. 연락처 공개 여부는 마지막 단계에서 직접 선택합니다.</div>
        </div>}
        {activeStep === 'intro' && <div className="resume-step-panel">
          <div className="resume-panel-head"><small>STEP 02</small><h2>경력·소개</h2><p>경력, 강점, 희망 조건을 자유롭게 한 번에 적어주세요. 형식은 자유입니다.</p></div>
          <label className="resume-intro"><span>경력·자기소개 *</span><textarea required rows="10" value={form.introduction} onChange={(e) => update('introduction', e.target.value)} placeholder={"예)\n- 부산 ○○병원 병동 간호 5년 (내과·외과)\n- 야간 근무 가능, 2026년 3월 이후 입사 가능\n- 강점: 중환자 케어, 신규 교육\n- 희망: 부산·양산권, 주 5일, 협의"} /><small>{form.introduction.length}자</small></label>
          <div className="resume-form-grid">
            <label><span>희망 근무지역</span><input value={form.desiredRegions} onChange={(e) => update('desiredRegions', e.target.value)} placeholder="예: 부산 전 지역, 경남 양산·김해" /></label>
            <label><span>희망 보수</span><input value={form.salary} onChange={(e) => update('salary', e.target.value)} placeholder="예: 협의 · 월 400만원 이상" /></label>
          </div>
        </div>}
        {activeStep === 'visibility' && <div className="resume-step-panel">
          <div className="resume-panel-head"><small>STEP 03</small><h2>공개설정</h2><p>이 이력서를 어디까지 공개할지 직접 정하세요.</p></div>
          <fieldset className="resume-visibility"><legend>구직글 공개 설정</legend>{[['public','구직 등록 (채용기관 공개)','병원 회원이 익명 프로필로 나를 검색할 수 있습니다.'],['proposal','제안 올 때만 공개','평소엔 비공개이며, 맞는 병원 제안이 있을 때 동의를 요청합니다.'],['private','비공개 보관','목록에 올리지 않고, 내가 직접 지원할 때만 전달합니다.']].map(([value,title,copy]) => <label key={value} className={form.visibility === value ? 'active' : ''}><input type="radio" name="visibility" value={value} checked={form.visibility === value} onChange={(e) => update('visibility', e.target.value)} /><span><strong>{title}</strong><small>{copy}</small></span>{form.visibility === value && <Check />}</label>)}</fieldset>
          <fieldset className="resume-visibility resume-contact-visibility"><legend>연락처 공개 설정</legend>{[['private','연락처 비공개 (권장)','병원이 이력서 열람권을 구매해도 전화번호와 이메일은 공개하지 않습니다. 플랫폼 메시지로 먼저 연락받습니다.'],['ticket','열람권 구매 병원에 공개','병원 회원이 내 이력서 열람권을 구매하면 전화번호와 이메일을 확인할 수 있습니다.']].map(([value,title,copy]) => <label key={value} className={form.contactVisibility === value ? 'active' : ''}><input type="radio" name="contactVisibility" value={value} checked={form.contactVisibility === value} onChange={(e) => update('contactVisibility', e.target.value)} /><span><strong>{title}</strong><small>{copy}</small></span>{form.contactVisibility === value && <Check />}</label>)}</fieldset>
          <label className="resume-consent"><input type="checkbox" checked={form.consent} onChange={(e) => update('consent', e.target.checked)} /><span>이력서 등록과 채용 매칭을 위한 개인정보 수집·이용에 동의합니다.</span></label>
        </div>}
        <div className="resume-step-actions"><button type="button" className="button outline" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}><ChevronLeft /> 이전</button>{step < steps.length - 1 ? <button type="button" className="button primary" onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>다음 단계 <ChevronRight /></button> : <button type="submit" className="button primary" disabled={submitting}>{submitting ? '등록 중…' : '이력서 등록하기'} <ArrowRight /></button>}</div>
        {submitError && <p className="form-error" role="alert">{submitError}</p>}
      </section>
      <aside className="resume-preview"><small>LIVE PREVIEW</small><div className={`resume-preview-avatar ${photoPreview || form.photoUrl ? 'has-photo' : ''}`}>{photoPreview || form.photoUrl ? <img src={photoPreview || withBase(form.photoUrl)} alt="프로필 사진" /> : <UserRound />}</div><h3>{form.title || '이력서 제목을 입력해주세요'}</h3><span className="resume-preview-role">{form.profession || '직군 미입력'}{form.specialty ? ` · ${form.specialty}` : ''}</span><dl><div><dt>희망 지역</dt><dd>{form.desiredRegions || form.region || '미입력'}</dd></div><div><dt>희망 보수</dt><dd>{form.salary || '협의'}</dd></div></dl><div className="resume-preview-privacy"><LockKeyhole /><span><strong>연락처 {form.contactVisibility === 'ticket' ? '조건부 공개' : '비공개'}</strong><small>{form.contactVisibility === 'ticket' ? '열람권을 구매한 병원에만 공개됩니다.' : '열람권을 구매해도 공개되지 않습니다.'}</small></span></div></aside>
    </form>
  </main>;
}
