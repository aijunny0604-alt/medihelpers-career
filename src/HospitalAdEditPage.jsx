import { SAMPLE_BANNER_TEMPLATES } from './bannerTemplates.js';
import { getAdTierPresentation } from './adTierPresentation.js';
import { invalidateSiteOperations } from './siteOperations.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CircleCheck, ImagePlus, PencilLine, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { withBase } from './basePath.js';
import { dropImageFiles, pasteImageFiles } from './imageInput.js';
import { uploadJobImage } from './jobPostingUpload.js';
import { prepareImageUpload } from './imageOptimization.js';
import { saveHospitalAd } from './hospitalAdUpdate.js';

function displayImageUrl(value) {
  if (!value) return '';
  return /^(?:https?:|blob:|data:)/i.test(value) ? value : withBase(value);
}

function EditableImage({ label, description, purpose, value, file, onChange, onRemove, onPreparing, disabled }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [failedPreview, setFailedPreview] = useState('');
  const selection = useRef(0);
  const preview = useMemo(() => file ? URL.createObjectURL(file) : displayImageUrl(value), [file, value]);
  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { selection.current++; }, []);
  const choose = async (nextFile, input) => {
    if (input) input.value = '';
    if (!nextFile || disabled) return;
    const token = ++selection.current;
    setError(''); setNotice(''); setPreparing(true); onPreparing(1);
    try {
      const prepared = await prepareImageUpload(nextFile, purpose);
      if (selection.current !== token) return;
      onChange(prepared.file); setNotice(prepared.notice);
    } catch (problem) {
      if (selection.current === token) setError(problem.message || '이미지를 준비하지 못했습니다. 다시 선택해주세요.');
    } finally {
      onPreparing(-1);
      if (selection.current === token) setPreparing(false);
    }
  };
  return <div
    className={`owned-ad-image-field ${dragging ? 'is-dragging' : ''}`}
    tabIndex="0"
    aria-label={`${label} 업로드: 클릭, 드래그 또는 붙여넣기`}
    data-purpose={purpose}
    onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
    onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDragging(true); }}
    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
    onDrop={(event) => { setDragging(false); dropImageFiles(event, (files) => choose(files[0])); }}
    onPaste={(event) => pasteImageFiles(event, (files) => choose(files[0]))}
  >
    <div className={`owned-ad-image-preview ${preview ? 'has-image' : ''}`}>{preview && failedPreview !== preview ? <img src={preview} alt={`${label} 미리보기`} onError={() => setFailedPreview(preview)} /> : <ImagePlus aria-label={preview ? '이미지를 불러오지 못했습니다' : '이미지 없음'} />}</div>
    <div className="owned-ad-image-copy"><strong>{label}</strong><p>{description}</p><small>선택·드래그앤드롭·Ctrl+V 붙여넣기 · 원본 20MB까지 자동 최적화</small><div><label><Upload /> 이미지 변경<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={(event) => choose(event.target.files?.[0], event.target)} /></label>{(value || file) && <button type="button" disabled={disabled} onClick={() => { selection.current++; setPreparing(false); setError(''); setNotice(''); onRemove(); }}><Trash2 /> 삭제</button>}</div>{preparing && <small role="status">이미지 준비 중…</small>}{notice && <small>{notice}</small>}{error && <em role="alert">{error}</em>}</div>
  </div>;
}

export default function HospitalAdEditPage({ ad }) {
  const payload = ad?.payload || {};
  const [form, setForm] = useState({
    title:ad?.title || '', hospital:ad?.subtitle || payload.hospital || '', facilityType:payload.facilityType || '',
    address:payload.address || payload.region || payload.primary || '', website:payload.website || '',
    department:payload.department || payload.specialties || payload.role || '', salaryBasis:payload.salaryBasis || payload.pay || '',
    incentive:payload.incentive || '', exactHours:payload.exactHours || payload.schedule || '', onCall:payload.onCall || '',
    patientLoad:payload.patientLoad || '', procedureScope:payload.procedureScope || '', supportTeam:payload.supportTeam || '',
    leavePolicy:payload.leavePolicy || '', startTiming:payload.startTiming || '', interviewProcess:payload.interviewProcess || '',
    introduction:payload.introduction || payload.description || '', logo:payload.logo || '', banner:payload.banner || '', brandImageLayout:payload.brandImageLayout || ''
  });
  const isMainAd = getAdTierPresentation(payload.adTier)?.key === 'main';
  const selectedTemplate = SAMPLE_BANNER_TEMPLATES.find((template) => template.src === form.banner);
  const changeBanner = (banner, brandImageLayout = '') => {
    setBannerFile(null);
    setForm((current) => ({ ...current, banner, brandImageLayout }));
    setSaved(false);
  };
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const preparingRef = useRef(0);
  const [preparingImages, setPreparingImages] = useState(0);
  const imagePreparing = (delta) => { preparingRef.current = Math.max(0, preparingRef.current + delta); if (mounted.current) setPreparingImages(preparingRef.current); };
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const update = (key, value) => setForm((current) => ({ ...current, [key]:value }));
  const submit = async (event) => {
    event.preventDefault();
    if (submitLock.current) return;
    if (preparingRef.current) { setError('이미지 준비가 끝나면 저장해주세요.'); return; }
    submitLock.current = true;
    setSubmitting(true); setError(''); setSaved(false);
    try {
      const logo = logoFile ? await uploadJobImage(logoFile, 'logo') : form.logo;
      if (!mounted.current) return;
      const banner = bannerFile ? await uploadJobImage(bannerFile, 'banner') : form.banner;
      if (!mounted.current) return;
      await saveHospitalAd(ad.contentRecordId, { ...form, logo, banner });
      if (!mounted.current) return;
      invalidateSiteOperations();
      setForm((current) => ({ ...current, logo, banner }));
      setLogoFile(null); setBannerFile(null); setSaved(true);
      window.location.assign(withBase(`/jobs/admin-${encodeURIComponent(ad.contentRecordId)}`));
    } catch (submitError) {
      if (mounted.current) setError(submitError.message || '공고를 수정하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally { submitLock.current = false; if (mounted.current) setSubmitting(false); }
  };

  return <section className="owned-ad-edit-page">
    <div className="owned-ad-edit-heading"><div><small>MY RECRUITMENT AD</small><h2>내 채용공고 수정</h2><p>공고 내용은 저장 즉시 공개 화면에 반영됩니다.</p></div><a className="button outline" href={withBase('/mypage?tab=ads')}><ArrowLeft /> 내 공고로</a></div>
    {saved && <div className="owned-ad-saved" role="status"><CircleCheck /><div><strong>공고 수정이 완료되었습니다</strong><p>광고 상품과 게시 기간은 그대로 유지하고 작성 내용만 반영했습니다.</p></div><a href={withBase(`/jobs/admin-${encodeURIComponent(ad.contentRecordId)}`)}>공개 공고 보기 <ArrowRight /></a></div>}
    <form className="owned-ad-edit-form" onSubmit={submit}>
      <section className="member-panel"><div className="member-panel-head"><div><h3>공고 기본정보</h3><p>구직자가 목록에서 먼저 확인하는 제목과 병원 정보입니다.</p></div><PencilLine /></div><div className="owned-ad-form-grid">
        <label className="wide"><span>공고 제목 *</span><input required value={form.title} onChange={(event) => update('title', event.target.value)} /></label>
        <label><span>병원·기관명 *</span><input readOnly required value={form.hospital} onChange={(event) => update('hospital', event.target.value)} /></label>
        <label><span>기관 유형</span><input value={form.facilityType} onChange={(event) => update('facilityType', event.target.value)} placeholder="예: 종합병원, 의원, 검진센터" /></label>
        <label className="wide"><span>주소</span><input value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
        <label className="wide"><span>홈페이지</span><input type="url" value={form.website} onChange={(event) => update('website', event.target.value)} placeholder="https://" /></label>
      </div></section>
      <section className="member-panel"><div className="member-panel-head"><div><h3>채용 조건</h3><p>초빙 분야를 확인하고 급여·근무 일정·추가 안내만 간단히 수정합니다.</p></div></div><div className="owned-ad-form-grid">
        <label className="wide"><span>초빙 분야 *</span><input required value={form.department} onChange={(event) => update('department', event.target.value)} placeholder="예: 정형외과 전문의, 검진센터 진료원장" /></label>
        <label><span>급여·보수</span><input value={form.salaryBasis} onChange={(event) => update('salaryBasis', event.target.value)} placeholder="예: 월 1,500만원 · 협의 가능" /></label>
        <label><span>근무 일정</span><input value={form.exactHours} onChange={(event) => update('exactHours', event.target.value)} placeholder="예: 평일 08:30~17:30 · 토요일 격주" /></label>
        <label className="wide"><span>추가 안내</span><textarea rows="5" value={form.introduction} onChange={(event) => update('introduction', event.target.value)} placeholder="당직, 휴무, 인센티브 등 꼭 알릴 내용만 자유롭게 적어주세요." /></label>
      </div></section>
      <section className="member-panel"><div className="member-panel-head"><div><h3>공고 이미지</h3><p>기존 이미지를 유지하거나 새 이미지로 교체할 수 있습니다.</p></div></div><div className="owned-ad-image-grid">
        <EditableImage label="병원 로고·브랜드 이미지" description="병원명 옆과 브랜드 영역에 사용됩니다." purpose="logo" value={form.logo} file={logoFile} onPreparing={imagePreparing} disabled={submitting} onChange={setLogoFile} onRemove={() => { setLogoFile(null); update('logo',''); }} />
        <EditableImage label="채용공고 배너" description="목록 카드와 공고 상세 상단에 사용됩니다. 권장 비율은 3:1이며 원본 비율을 유지합니다." purpose="banner" value={form.banner} file={bannerFile} onPreparing={imagePreparing} disabled={submitting} onChange={(file) => { setBannerFile(file); setForm((current) => ({ ...current, banner:'', brandImageLayout:'full-banner' })); setSaved(false); }} onRemove={() => changeBanner('')} />
      </div>
      {isMainAd && <div className="sample-banner-picker">
        <div className="sample-banner-picker-head"><div><strong>배경 배너 템플릿</strong><small>공고 등록과 동일한 배경입니다. 선택하면 병원명이 배경 위에 자동으로 표시됩니다.</small></div>{selectedTemplate && <button type="button" disabled={submitting || preparingImages > 0} onClick={() => changeBanner('')}>선택 해제</button>}</div>
        <div className="sample-banner-grid">{SAMPLE_BANNER_TEMPLATES.map((template) => <button key={template.id} type="button" disabled={submitting || preparingImages > 0} className={selectedTemplate?.id === template.id ? 'active' : ''} aria-pressed={selectedTemplate?.id === template.id} onClick={() => changeBanner(template.src, 'template-overlay')}><span><img src={withBase(template.src)} alt="" /></span><strong>{template.name}</strong><small>{template.tone}</small></button>)}</div>
      </div>}
      </section>
      <div className="owned-ad-edit-footer"><div><ShieldCheck /><span><strong>유료 병원 공고는 내용 수정만 가능합니다</strong><small>광고 계약·결제 이력을 보호하기 위해 직접 삭제할 수 없습니다. 게시 중단이나 환불은 고객센터에 문의해주세요.</small></span></div><div><a className="button outline" href={withBase('/mypage?tab=ads')}>취소</a><button className="button primary" type="submit" disabled={submitting || preparingImages > 0}>{preparingImages ? '이미지 준비 중…' : submitting ? '저장 중…' : '수정내용 저장'} <ArrowRight /></button></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  </section>;
}
