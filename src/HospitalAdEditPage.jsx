import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CircleCheck, ImagePlus, PencilLine, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { withBase } from './basePath.js';
import { dropImageFiles, pasteImageFiles } from './imageInput.js';
import { JOB_IMAGE_MAX_BYTES, uploadJobImage } from './jobPostingUpload.js';

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];

function displayImageUrl(value) {
  if (!value) return '';
  return /^(?:https?:|blob:|data:)/i.test(value) ? value : withBase(value);
}

function EditableImage({ label, description, purpose, value, file, onChange, onRemove }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const preview = useMemo(() => file ? URL.createObjectURL(file) : displayImageUrl(value), [file, value]);
  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);
  const choose = (nextFile, input) => {
    if (!nextFile) return;
    if (!imageTypes.includes(nextFile.type)) {
      setError('JPG·PNG·WEBP 이미지만 사용할 수 있습니다.');
      if (input) input.value = '';
      return;
    }
    if (nextFile.size > JOB_IMAGE_MAX_BYTES) {
      setError('이미지는 5MB 이하만 사용할 수 있습니다.');
      if (input) input.value = '';
      return;
    }
    setError('');
    onChange(nextFile);
    if (input) input.value = '';
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
    <div className={`owned-ad-image-preview ${preview ? 'has-image' : ''}`}>{preview ? <img src={preview} alt={`${label} 미리보기`} /> : <ImagePlus />}</div>
    <div className="owned-ad-image-copy"><strong>{label}</strong><p>{description}</p><small>선택·드래그앤드롭·Ctrl+V 붙여넣기 · 최대 5MB</small><div><label><Upload /> 이미지 변경<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choose(event.target.files?.[0], event.target)} /></label>{(value || file) && <button type="button" onClick={onRemove}><Trash2 /> 삭제</button>}</div>{error && <em>{error}</em>}</div>
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
    introduction:payload.introduction || payload.description || '', logo:payload.logo || '', banner:payload.banner || ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const update = (key, value) => setForm((current) => ({ ...current, [key]:value }));
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true); setError(''); setSaved(false);
    try {
      const logo = logoFile ? await uploadJobImage(logoFile, 'logo') : form.logo;
      const banner = bannerFile ? await uploadJobImage(bannerFile, 'banner') : form.banner;
      const response = await fetch(withBase('/api/member-center'), {
        method:'POST', credentials:'same-origin', headers:{ 'content-type':'application/json' },
        body:JSON.stringify({ action:'owned_ad_update', contentRecordId:ad.contentRecordId, content:{ ...form, logo, banner } })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.updated) throw new Error(result.error || '공고를 수정하지 못했습니다.');
      setForm((current) => ({ ...current, logo, banner }));
      setLogoFile(null); setBannerFile(null); setSaved(true);
      window.scrollTo({ top:0, behavior:'smooth' });
    } catch (submitError) {
      setError(submitError.message || '공고를 수정하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally { setSubmitting(false); }
  };

  return <section className="owned-ad-edit-page">
    <div className="owned-ad-edit-heading"><div><small>MY RECRUITMENT AD</small><h2>내 채용공고 수정</h2><p>공고 내용은 저장 즉시 공개 화면에 반영됩니다.</p></div><a className="button outline" href={withBase('/mypage?tab=ads')}><ArrowLeft /> 내 공고로</a></div>
    {saved && <div className="owned-ad-saved" role="status"><CircleCheck /><div><strong>공고 수정이 완료되었습니다</strong><p>광고 상품과 게시 기간은 그대로 유지하고 작성 내용만 반영했습니다.</p></div><a href={withBase(`/jobs/admin-${encodeURIComponent(ad.contentRecordId)}`)}>공개 공고 보기 <ArrowRight /></a></div>}
    <form className="owned-ad-edit-form" onSubmit={submit}>
      <section className="member-panel"><div className="member-panel-head"><div><h3>공고 기본정보</h3><p>구직자가 목록에서 먼저 확인하는 제목과 병원 정보입니다.</p></div><PencilLine /></div><div className="owned-ad-form-grid">
        <label className="wide"><span>공고 제목 *</span><input required value={form.title} onChange={(event) => update('title', event.target.value)} /></label>
        <label><span>병원·기관명 *</span><input required value={form.hospital} onChange={(event) => update('hospital', event.target.value)} /></label>
        <label><span>기관 유형</span><input value={form.facilityType} onChange={(event) => update('facilityType', event.target.value)} placeholder="예: 종합병원, 의원, 검진센터" /></label>
        <label className="wide"><span>주소</span><input value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
        <label className="wide"><span>홈페이지</span><input type="url" value={form.website} onChange={(event) => update('website', event.target.value)} placeholder="https://" /></label>
      </div></section>
      <section className="member-panel"><div className="member-panel-head"><div><h3>채용 조건</h3><p>결제금액·광고등급·게시기간을 제외한 실제 채용 조건을 수정합니다.</p></div></div><div className="owned-ad-form-grid">
        <label><span>진료과·초빙분야</span><input value={form.department} onChange={(event) => update('department', event.target.value)} /></label>
        <label><span>급여·보수</span><input value={form.salaryBasis} onChange={(event) => update('salaryBasis', event.target.value)} /></label>
        <label><span>인센티브</span><input value={form.incentive} onChange={(event) => update('incentive', event.target.value)} /></label>
        <label><span>근무시간</span><input value={form.exactHours} onChange={(event) => update('exactHours', event.target.value)} /></label>
        <label><span>당직·온콜</span><input value={form.onCall} onChange={(event) => update('onCall', event.target.value)} /></label>
        <label><span>환자·검사량</span><input value={form.patientLoad} onChange={(event) => update('patientLoad', event.target.value)} /></label>
        <label><span>진료·시술 범위</span><input value={form.procedureScope} onChange={(event) => update('procedureScope', event.target.value)} /></label>
        <label><span>지원 인력</span><input value={form.supportTeam} onChange={(event) => update('supportTeam', event.target.value)} /></label>
        <label><span>휴무·휴가</span><input value={form.leavePolicy} onChange={(event) => update('leavePolicy', event.target.value)} /></label>
        <label><span>입사 가능 시점</span><input value={form.startTiming} onChange={(event) => update('startTiming', event.target.value)} /></label>
        <label className="wide"><span>면접 절차</span><input value={form.interviewProcess} onChange={(event) => update('interviewProcess', event.target.value)} /></label>
        <label className="wide"><span>병원·채용 소개</span><textarea rows="7" value={form.introduction} onChange={(event) => update('introduction', event.target.value)} /></label>
      </div></section>
      <section className="member-panel"><div className="member-panel-head"><div><h3>공고 이미지</h3><p>기존 이미지를 유지하거나 새 이미지로 교체할 수 있습니다.</p></div></div><div className="owned-ad-image-grid">
        <EditableImage label="병원 로고·브랜드 이미지" description="병원명 옆과 브랜드 영역에 사용됩니다." purpose="logo" value={form.logo} file={logoFile} onChange={setLogoFile} onRemove={() => { setLogoFile(null); update('logo',''); }} />
        <EditableImage label="채용공고 배너" description="목록 카드와 공고 상세 상단에 사용되는 3:1 배너입니다." purpose="banner" value={form.banner} file={bannerFile} onChange={setBannerFile} onRemove={() => { setBannerFile(null); update('banner',''); }} />
      </div></section>
      <div className="owned-ad-edit-footer"><div><ShieldCheck /><span><strong>본인 공고만 수정할 수 있습니다</strong><small>서버가 로그인 계정과 결제 주문의 소유권을 다시 확인합니다.</small></span></div><div><a className="button outline" href={withBase('/mypage?tab=ads')}>취소</a><button className="button primary" type="submit" disabled={submitting}>{submitting ? '저장 중…' : '수정내용 저장'} <ArrowRight /></button></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  </section>;
}
