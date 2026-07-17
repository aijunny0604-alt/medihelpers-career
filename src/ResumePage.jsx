import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BadgeCheck, BriefcaseBusiness, Check, ChevronLeft, ChevronRight,
  Camera, CircleCheck, FileText, GraduationCap, LockKeyhole, Plus, ShieldCheck,
  Stethoscope, Trash2, Upload, UserRound, X
} from 'lucide-react';
import { appendStoredRecord } from './browserStorage.js';
import { withBase } from './basePath.js';

const steps = [
  { id: 'basic', label: '기본정보', icon: UserRound },
  { id: 'license', label: '면허·전문분야', icon: Stethoscope },
  { id: 'career', label: '경력·학력', icon: BriefcaseBusiness },
  { id: 'preference', label: '희망 근무조건', icon: BadgeCheck },
  { id: 'intro', label: '소개·공개설정', icon: FileText }
];

const professions = ['의사', '치과의사', '한의사', '간호사', '간호조무사', '약사', '의료기사', '치과위생사', '원무·행정', '기타 의료인'];
const workTypes = ['정규직', '계약직', '파트타임', '당직·대진', '프리랜서', '협의 가능'];
const emptyCareer = () => ({ institution: '', department: '', position: '', start: '', end: '', current: false, duties: '' });

export default function ResumePage() {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [certificateFiles, setCertificateFiles] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [careers, setCareers] = useState([emptyCareer()]);
  const [form, setForm] = useState({
    title: '', profession: '의사', name: '', phone: '', email: '', region: '',
    licenseName: '의사 면허', licenseNumber: '', specialty: '', skills: '', experienceYears: '',
    school: '', major: '', graduation: '', desiredRegions: '', workTypes: ['정규직'], salary: '', available: '',
    schedule: '', nightDuty: '협의 가능', housing: '필요 없음', introduction: '', visibility: 'proposal', consent: false
  });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (!profilePhoto) {
      setPhotoPreview('');
      return undefined;
    }
    const previewUrl = URL.createObjectURL(profilePhoto);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [profilePhoto]);
  const chooseProfilePhoto = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('JPG·PNG·WEBP 형식만 등록할 수 있습니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('프로필 사진은 5MB 이하로 등록해주세요.');
      return;
    }
    setPhotoError('');
    setProfilePhoto(file);
  };
  const toggleWorkType = (value) => update('workTypes', form.workTypes.includes(value) ? form.workTypes.filter((item) => item !== value) : [...form.workTypes, value]);
  const updateCareer = (index, key, value) => setCareers((current) => current.map((career, careerIndex) => careerIndex === index ? { ...career, [key]: value } : career));
  const completion = useMemo(() => {
    const required = [form.title, form.profession, form.name, form.phone, form.email, form.licenseName, form.desiredRegions, form.workTypes.length, form.introduction];
    return Math.round((required.filter(Boolean).length / required.length) * 100);
  }, [form]);

  const submit = (event) => {
    event.preventDefault();
    if (!form.consent) return;
    appendStoredRecord('medihelpers_resumes', {
      id: `RES-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'draft-review',
      ...form,
      careers,
      profilePhotoName: profilePhoto?.name || '',
      resumeFileName: resumeFile?.name || '',
      certificateFileNames: certificateFiles.map((file) => file.name)
    });
    setCompleted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (completed) return <main className="resume-page"><section className="resume-complete"><span><CircleCheck /></span><small>MEDICAL RESUME REGISTERED</small><h1>의료인 이력서가 등록되었습니다</h1><p>공개 범위는 <strong>{form.visibility === 'public' ? '채용기관 공개' : form.visibility === 'proposal' ? '제안 요청 시 공개' : '비공개 보관'}</strong>로 설정했습니다.<br />면허·자격 서류는 담당자가 확인하기 전까지 외부에 공개되지 않습니다.</p><div><a className="button primary" href={withBase('/jobs')}>맞춤 채용정보 보기 <ArrowRight /></a><button className="button outline" onClick={() => setCompleted(false)}>이력서 수정</button></div></section></main>;

  const activeStep = steps[step].id;
  return <main className="resume-page">
    <header className="resume-hero"><div><span><FileText /> MEDICAL CAREER PROFILE</span><h1>의료인 이력서 등록</h1><p>면허와 의료기관 경력, 희망 근무조건을 중심으로 작성하면 맞는 공고와 제안을 더 정확하게 연결합니다.</p></div><div className="resume-security"><ShieldCheck /><span><strong>민감정보는 비공개가 기본입니다</strong><small>주민등록번호는 받지 않으며 면허번호와 첨부서류는 검증 목적으로만 사용합니다.</small></span></div></header>
    <form className="resume-layout" onSubmit={submit}>
      <aside className="resume-step-nav"><div className="resume-progress"><div><span>작성 완성도</span><strong>{completion}%</strong></div><i><b style={{ width: `${completion}%` }} /></i></div>{steps.map((item, index) => { const Icon = item.icon; return <button type="button" key={item.id} className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => setStep(index)}><span>{index < step ? <Check /> : <Icon />}</span><div><small>STEP {String(index + 1).padStart(2, '0')}</small><strong>{item.label}</strong></div></button>; })}<div className="resume-help"><LockKeyhole /><span><strong>공개 범위를 직접 선택</strong><small>비공개 보관부터 채용기관 공개까지 설정할 수 있습니다.</small></span></div></aside>
      <section className="resume-editor">
        {activeStep === 'basic' && <div className="resume-step-panel">
          <div className="resume-panel-head"><small>STEP 01</small><h2>기본정보와 직군</h2><p>채용기관이 가장 먼저 확인하는 정보입니다.</p></div>
          <div className="resume-basic-profile">
            <div className="resume-photo-field">
              <span className="resume-photo-label">프로필 사진 <i>선택</i></span>
              <div className={`resume-photo-preview ${photoPreview ? 'has-photo' : ''}`}>
                {photoPreview ? <img src={photoPreview} alt="등록할 프로필 사진 미리보기" /> : <UserRound />}
                {profilePhoto && <button type="button" onClick={() => { setProfilePhoto(null); setPhotoError(''); }} aria-label="프로필 사진 삭제"><X /></button>}
              </div>
              <label className="resume-photo-button">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseProfilePhoto(event.target.files?.[0])} />
                <Camera /> {profilePhoto ? '사진 변경' : '사진 등록'}
              </label>
              <small>JPG·PNG·WEBP · 최대 5MB</small>
              {photoError && <p>{photoError}</p>}
            </div>
            <div className="resume-form-grid">
              <label className="wide"><span>이력서 제목 *</span><input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="예: 소화기내과 전문의 · 부산경남 이직 희망" /></label>
              <label><span>의료 직군 *</span><select value={form.profession} onChange={(e) => update('profession', e.target.value)}>{professions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>현재 거주지역</span><input value={form.region} onChange={(e) => update('region', e.target.value)} placeholder="예: 부산광역시" /></label>
              <label><span>이름 *</span><input required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="홍길동" /></label>
              <label><span>휴대폰 *</span><input required type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="010-0000-0000" /></label>
              <label className="wide"><span>이메일 *</span><input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="doctor@example.com" /></label>
            </div>
          </div>
          <div className="resume-safe-note"><ShieldCheck /> 사진은 선택사항이며 익명 인재목록에는 노출되지 않습니다. 실명·연락처·사진은 본인 동의 후에만 전달합니다.</div>
        </div>}
        {activeStep === 'license' && <div className="resume-step-panel"><div className="resume-panel-head"><small>STEP 02</small><h2>면허·자격과 전문분야</h2><p>직군에 따라 면허, 전문과목과 실제 가능한 업무를 적어주세요.</p></div><div className="resume-form-grid"><label><span>면허·자격 명칭 *</span><input required value={form.licenseName} onChange={(e) => update('licenseName', e.target.value)} placeholder="예: 의사 면허, 간호사 면허" /></label><label><span>면허번호 <i>비공개</i></span><input value={form.licenseNumber} onChange={(e) => update('licenseNumber', e.target.value)} placeholder="검증 전까지 비공개" /></label><label><span>전문과목·세부직무</span><input value={form.specialty} onChange={(e) => update('specialty', e.target.value)} placeholder="예: 소화기내과, 병동간호, 방사선촬영" /></label><label><span>총 경력</span><input value={form.experienceYears} onChange={(e) => update('experienceYears', e.target.value)} placeholder="예: 전문의 8년" /></label><label className="wide"><span>주요 술기·업무 역량</span><textarea rows="4" value={form.skills} onChange={(e) => update('skills', e.target.value)} placeholder="예: 위·대장 내시경, 초음파, EMR 사용, 중환자실 근무" /></label></div><div className="resume-file-box"><div><Upload /><span><strong>면허·자격증 사본</strong><small>PDF·JPG·PNG, 최대 5개 · 채용기관에는 동의 후 공개</small></span></div><label><input type="file" multiple accept=".pdf,image/png,image/jpeg" onChange={(e) => setCertificateFiles([...(e.target.files || [])].slice(0, 5))} />{certificateFiles.length ? `${certificateFiles.length}개 선택됨` : '파일 선택'}</label></div></div>}
        {activeStep === 'career' && <div className="resume-step-panel"><div className="resume-panel-head inline"><div><small>STEP 03</small><h2>의료기관 경력</h2><p>최근 경력부터 입력하면 병원에서 빠르게 확인할 수 있습니다.</p></div><button type="button" onClick={() => setCareers((current) => [...current, emptyCareer()])}><Plus /> 경력 추가</button></div><div className="career-list">{careers.map((career, index) => <article key={index}><div className="career-card-head"><strong>경력 {index + 1}</strong>{careers.length > 1 && <button type="button" onClick={() => setCareers((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 /> 삭제</button>}</div><div className="resume-form-grid"><label><span>의료기관명</span><input value={career.institution} onChange={(e) => updateCareer(index, 'institution', e.target.value)} placeholder="근무 기관명" /></label><label><span>부서·진료과</span><input value={career.department} onChange={(e) => updateCareer(index, 'department', e.target.value)} placeholder="예: 소화기내과" /></label><label><span>직책</span><input value={career.position} onChange={(e) => updateCareer(index, 'position', e.target.value)} placeholder="예: 과장, 책임간호사" /></label><label><span>근무기간</span><div className="period-input"><input type="month" value={career.start} onChange={(e) => updateCareer(index, 'start', e.target.value)} /><b>~</b><input type="month" disabled={career.current} value={career.end} onChange={(e) => updateCareer(index, 'end', e.target.value)} /></div></label><label className="wide"><span>담당업무·진료범위</span><textarea rows="3" value={career.duties} onChange={(e) => updateCareer(index, 'duties', e.target.value)} placeholder="담당 환자, 술기, 장비, 근무 형태 등" /></label><label className="resume-check"><input type="checkbox" checked={career.current} onChange={(e) => updateCareer(index, 'current', e.target.checked)} />현재 재직 중</label></div></article>)}</div><div className="education-card"><div><GraduationCap /><strong>최종 학력</strong></div><div className="resume-form-grid"><label><span>학교명</span><input value={form.school} onChange={(e) => update('school', e.target.value)} /></label><label><span>전공</span><input value={form.major} onChange={(e) => update('major', e.target.value)} /></label><label><span>졸업상태</span><select value={form.graduation} onChange={(e) => update('graduation', e.target.value)}><option value="">선택</option><option>졸업</option><option>졸업예정</option><option>수료</option></select></label></div></div></div>}
        {activeStep === 'preference' && <div className="resume-step-panel"><div className="resume-panel-head"><small>STEP 04</small><h2>희망 근무조건</h2><p>조건이 구체적일수록 맞지 않는 제안을 줄일 수 있습니다.</p></div><div className="resume-form-grid"><label className="wide"><span>희망 근무지역 *</span><input required value={form.desiredRegions} onChange={(e) => update('desiredRegions', e.target.value)} placeholder="예: 부산 전 지역, 경남 양산·김해" /></label><fieldset className="wide"><legend>희망 근무형태 *</legend><div className="resume-choice-grid">{workTypes.map((item) => <button type="button" key={item} className={form.workTypes.includes(item) ? 'active' : ''} onClick={() => toggleWorkType(item)}>{form.workTypes.includes(item) && <Check />}{item}</button>)}</div></fieldset><label><span>희망 보수</span><input value={form.salary} onChange={(e) => update('salary', e.target.value)} placeholder="예: 월 1,400만원 이상 · 협의" /></label><label><span>입사 가능 시점</span><input value={form.available} onChange={(e) => update('available', e.target.value)} placeholder="예: 1개월 내" /></label><label><span>희망 일정</span><input value={form.schedule} onChange={(e) => update('schedule', e.target.value)} placeholder="예: 주 4.5일, 토요일 격주" /></label><label><span>당직 가능 여부</span><select value={form.nightDuty} onChange={(e) => update('nightDuty', e.target.value)}><option>협의 가능</option><option>가능</option><option>불가</option></select></label><label><span>숙소 필요 여부</span><select value={form.housing} onChange={(e) => update('housing', e.target.value)}><option>필요 없음</option><option>필요</option><option>협의</option></select></label></div></div>}
        {activeStep === 'intro' && <div className="resume-step-panel"><div className="resume-panel-head"><small>STEP 05</small><h2>소개와 공개설정</h2><p>자체 이력서로 지원하거나 기존 이력서 파일을 함께 첨부할 수 있습니다.</p></div><label className="resume-intro"><span>경력 요약·자기소개 *</span><textarea required rows="8" value={form.introduction} onChange={(e) => update('introduction', e.target.value)} placeholder="환자 진료 경험, 강점, 이직 시 중요하게 보는 조건을 적어주세요." /><small>{form.introduction.length}자</small></label><div className="resume-file-box"><div><Upload /><span><strong>기존 이력서 첨부 <i>선택</i></strong><small>PDF·DOC·DOCX·HWP·HWPX, 최대 10MB</small></span></div><label><input type="file" accept=".pdf,.doc,.docx,.hwp,.hwpx" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />{resumeFile?.name || '파일 선택'}</label></div><fieldset className="resume-visibility"><legend>인재정보 공개 범위</legend>{[['public','채용기관 공개','검증된 병원회원이 익명 프로필을 검색할 수 있습니다.'],['proposal','제안 요청 시 공개','기본은 비공개이며 적합한 병원 제안이 있을 때 동의를 요청합니다.'],['private','비공개 보관','직접 지원할 때만 선택한 병원에 전달합니다.']].map(([value,title,copy]) => <label key={value} className={form.visibility === value ? 'active' : ''}><input type="radio" name="visibility" value={value} checked={form.visibility === value} onChange={(e) => update('visibility', e.target.value)} /><span><strong>{title}</strong><small>{copy}</small></span>{form.visibility === value && <Check />}</label>)}</fieldset><label className="resume-consent"><input type="checkbox" checked={form.consent} onChange={(e) => update('consent', e.target.checked)} /><span>이력서 등록과 채용 매칭을 위한 개인정보 수집·이용에 동의합니다. 면허·자격 정보는 검증과 채용 연결 목적으로만 사용됩니다.</span></label></div>}
        <div className="resume-step-actions"><button type="button" className="button outline" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}><ChevronLeft /> 이전</button>{step < steps.length - 1 ? <button type="button" className="button primary" onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>다음 단계 <ChevronRight /></button> : <button type="submit" className="button primary" disabled={!form.consent}>이력서 등록하기 <ArrowRight /></button>}</div>
      </section>
      <aside className="resume-preview"><small>LIVE PREVIEW</small><div className={`resume-preview-avatar ${photoPreview ? 'has-photo' : ''}`}>{photoPreview ? <img src={photoPreview} alt="" /> : <UserRound />}</div><h3>{form.title || '이력서 제목을 입력해주세요'}</h3><span className="resume-preview-role">{form.profession} · {form.specialty || '전문분야 미입력'}</span><dl><div><dt>총 경력</dt><dd>{form.experienceYears || '미입력'}</dd></div><div><dt>희망 지역</dt><dd>{form.desiredRegions || '미입력'}</dd></div><div><dt>근무 형태</dt><dd>{form.workTypes.join(' · ') || '미입력'}</dd></div><div><dt>입사 가능</dt><dd>{form.available || '협의'}</dd></div></dl><div className="resume-preview-privacy"><LockKeyhole /><span><strong>사진·연락처·면허번호 비공개</strong><small>공개 동의 전에는 채용기관에 표시하지 않습니다.</small></span></div></aside>
    </form>
  </main>;
}
