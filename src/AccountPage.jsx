import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, BadgeCheck, Building2, Check, CircleCheck, LoaderCircle,
  LockKeyhole, RotateCcw, ShieldCheck, Sparkles, Stethoscope, UserRound
} from 'lucide-react';
import { accountRoleLabel, validateSignup } from './signupModel.js';
import {
  allConsentsAccepted,
  clearDraftFields,
  createEmptyDraft,
  fieldsForRole,
  formatKoreanPhone,
  hospitalAccountFields,
  hospitalInfoFields,
  setAllConsents,
  validateApplicationDraft,
  validateField
} from './signupFields.js';
import { withBase } from './basePath.js';

const initialForm = (role = '') => ({
  role,
  termsAccepted: false,
  ageConfirmed: false,
  privacyAcknowledged: false
});

const roleContent = {
  doctor: {
    label: '의사 회원',
    eyebrow: 'DOCTOR MEMBER',
    title: '의사 회원가입',
    description: '의사 초빙정보 탐색과 비공개 이직 상담을 위한 계정입니다.',
    afterTitle: '면허·자격 확인은 나중에',
    afterCopy: '비공개 공고 열람이나 소개 진행 시점에 면허·자격 확인을 별도로 안내합니다. 가입 단계에서는 전문과·면허번호를 받지 않습니다.',
    benefits: [
      '채용공고 탐색과 관심공고 저장',
      '비공개 이직 상담 우선 연결',
      '지원·제안 진행 상황 관리'
    ],
    icon: Stethoscope
  },
  hospital: {
    label: '병원 회원',
    eyebrow: 'MEDICAL INSTITUTION',
    title: '병원 회원가입',
    description: '채용 의뢰와 메디헬퍼스 헤드헌터 상담을 위한 기관 담당자 계정입니다.',
    afterTitle: '기관 서류 확인은 나중에',
    afterCopy: '공고 등록이나 후보 상담 시점에 기관과 담당자 관계를 별도로 확인합니다. 가입 단계에서는 사업자등록증 등 서류를 받지 않습니다.',
    benefits: [
      '채용공고 등록과 노출 관리',
      '전담 헤드헌터 후보 상담',
      '채용 진행 상황과 상담 관리'
    ],
    icon: Building2
  }
};

// 프론트엔드 전용 신청 폼의 입력 필드 메타데이터입니다.
// autocomplete / inputMode / label 은 접근성과 입력 편의를 위해 필드별로 지정합니다.
const FIELD_META = {
  name: { label: '담당자 성명', type: 'text', autoComplete: 'name', placeholder: '예: 홍길동' },
  phone: { label: '휴대폰 번호', type: 'tel', autoComplete: 'tel', inputMode: 'numeric', placeholder: '010-1234-5678', phone: true, hint: '주민등록번호 대신 본인 명의 휴대폰으로 확인합니다.' },
  email: { label: '로그인 이메일', type: 'email', autoComplete: 'email', inputMode: 'email', placeholder: 'hr@hospital.co.kr', hint: '별도 아이디 없이 이메일을 로그인 아이디로 사용합니다.' },
  password: { label: '비밀번호', type: 'password', autoComplete: 'new-password', placeholder: '영문·숫자 포함 8자 이상', hint: '영문과 숫자를 포함해 8자 이상으로 만들어주세요.' },
  passwordConfirm: { label: '비밀번호 확인', type: 'password', autoComplete: 'new-password', placeholder: '비밀번호를 한 번 더 입력' },
  hospitalRole: { label: '담당자 직책', type: 'text', autoComplete: 'organization-title', placeholder: '예: 행정팀장, 원장' },
  department: { label: '부서명', optional: true, type: 'text', placeholder: '예: 인사팀, 원무과' },
  hospitalName: { label: '병원·기관명', type: 'text', autoComplete: 'organization', placeholder: '예: 서울메디컬센터' },
  representativeName: { label: '대표자명', type: 'text', placeholder: '예: 김메디' },
  institutionType: {
    label: '기관 유형',
    type: 'select',
    placeholder: '기관 유형을 선택해주세요',
    options: ['종합병원', '병원', '의원', '검진센터', '요양병원', '치과병·의원', '한방병·의원', '기타']
  },
  institutionPhone: { label: '병원 대표 전화', type: 'tel', inputMode: 'numeric', placeholder: '02-0000-0000', phone: true },
  postalCode: { label: '우편번호', type: 'text', inputMode: 'numeric', placeholder: '예: 06236' },
  address: { label: '병원 주소', type: 'text', autoComplete: 'street-address', placeholder: '예: 서울 강남구 테헤란로 123', wide: true },
  addressDetail: { label: '상세 주소', optional: true, type: 'text', placeholder: '예: 5층 인사팀', wide: true },
  website: { label: '홈페이지', optional: true, type: 'url', autoComplete: 'url', placeholder: 'https://www.hospital.co.kr' },
  businessNumber: { label: '사업자등록번호', optional: true, type: 'text', inputMode: 'numeric', placeholder: '000-00-00000', hint: '가입 단계에서는 선택사항이며, 광고 결제·기관 인증 전에 확인합니다.' },
  fax: { label: '팩스번호', optional: true, type: 'tel', inputMode: 'numeric', placeholder: '02-0000-0000', phone: true }
};

async function accountRequest(method = 'GET', body) {
  const response = await fetch('/api/account', {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const staticError = new Error('회원 시스템을 사용할 수 없는 배포 환경입니다.');
    staticError.code = 'STATIC_HOSTING';
    throw staticError;
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '요청을 처리하지 못했습니다.');
  return data;
}

function MemberTypeChooser() {
  return <section className="signup-card member-type-card">
    <span className="signup-card-icon"><UserRound /></span>
    <small>CHOOSE YOUR ACCOUNT</small>
    <h2>회원 유형을 선택해주세요</h2>
    <p>가입 목적과 확인 절차가 다르므로 의사 회원과 병원 회원을 분리해 운영합니다.</p>
    <div className="member-type-grid">
      <a className="doctor-choice" href={withBase('/signup/doctor')}><span><Stethoscope /></span><div><small>DOCTOR · 의사 회원</small><strong>이직·초빙정보를 찾고 있어요</strong><p>상세조건 무료 열람 · 비공개 이직 상담 · 이력서 관리</p><b>의사 회원으로 시작하기 <ArrowRight /></b></div></a>
      <a className="hospital-choice" href={withBase('/signup/hospital')}><span><Building2 /></span><div><small>HOSPITAL · 병원 회원</small><strong>의사를 채용하고 싶어요</strong><p>초빙공고 등록 · 후보 추천 · 채용 진행 관리</p><b>병원 회원으로 시작하기 <ArrowRight /></b></div></a>
    </div>
    <div className="signup-security-copy"><ShieldCheck /> 주민등록번호는 받지 않고, 정식 오픈 시 휴대폰 본인확인으로 중복 가입을 확인합니다.</div>
  </section>;
}

function SignupField({ fieldId, meta, value, error, onChange, onBlur }) {
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = [meta.hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return <div className={`signup-field ${meta.wide ? 'wide' : ''} ${error ? 'has-error' : ''}`}>
    <label htmlFor={fieldId}>{meta.label}{meta.optional ? <small>선택</small> : <b>*</b>}</label>
    {meta.type === 'select' ? <select
      id={fieldId}
      name={fieldId}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy}
    >
      <option value="">{meta.placeholder}</option>
      {meta.options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select> : <input
      id={fieldId}
      name={fieldId}
      type={meta.type}
      autoComplete={meta.autoComplete}
      inputMode={meta.inputMode}
      placeholder={meta.placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy}
    />}
    {meta.hint && !error && <small id={hintId} className="signup-field-hint">{meta.hint}</small>}
    {error && <em id={errorId} className="signup-field-error" role="alert">{error}</em>}
  </div>;
}

// 정식 오픈 전(백엔드 signupEnabled=false)에서 동작하는 프론트엔드 전용 회원가입 신청 폼입니다.

function PhoneVerificationField({ fieldId, meta, value, error, prepared, onChange, onBlur, onRequest }) {
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = [hintId, error ? errorId : null].filter(Boolean).join(' ');
  return <div className={`signup-field phone-verification-field ${error ? 'has-error' : ''}`}>
    <label htmlFor={fieldId}>{meta.label}<b>*</b></label>
    <div className="signup-phone-row">
      <input
        id={fieldId}
        name={fieldId}
        type="tel"
        autoComplete="tel"
        inputMode="numeric"
        placeholder={meta.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
      />
      <button type="button" onClick={onRequest}>휴대폰 인증</button>
    </div>
    {!error && <small id={hintId} className="signup-field-hint">{meta.hint}</small>}
    {error && <em id={errorId} className="signup-field-error" role="alert">{error}</em>}
    {prepared && <div className="phone-verification-preview" role="status"><ShieldCheck /><span><strong>휴대폰 본인확인 연결 위치입니다</strong><small>현재는 개인정보를 전송하지 않는 미리보기입니다. 정식 오픈 시 PASS·SMS 본인확인 창이 열립니다.</small></span></div>}
  </div>;
}

function AgreementItem({ id, checked, onChange, title, children, confirmation = '동의합니다' }) {
  return <article className="signup-agreement-item">
    <div className="signup-agreement-heading">
      <label htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span><b>필수</b><strong>{title}</strong></span>
      </label>
      <details>
        <summary>내용 보기</summary>
        <div className="signup-legal-copy">{children}</div>
      </details>
    </div>
    <p>{confirmation}</p>
  </article>;
}

function TermsCopy() {
  return <>
    <h4>메디헬퍼스 서비스 이용약관 주요 내용</h4>
    <dl>
      <div><dt>이용 목적</dt><dd>의사·의료인 채용정보, 인재정보, 비공개 이직상담, 병원 채용의뢰 및 관련 관리 서비스를 제공합니다.</dd></div>
      <div><dt>계정과 인증</dt><dd>계정은 가입자 본인 또는 등록된 병원 담당자만 사용할 수 있으며, 의사·병원 인증 권한은 운영 확인 후 부여됩니다.</dd></div>
      <div><dt>이용자 의무</dt><dd>허위 공고, 타인의 정보 도용, 무단 연락처 수집·판매, 후보자 동의 없는 개인정보 전달을 금지합니다.</dd></div>
      <div><dt>유료 서비스</dt><dd>공고·열람·채용 상품의 금액, 제공기간, 환불조건은 결제 전에 별도로 안내하고 동의를 받습니다.</dd></div>
      <div><dt>서비스 제한</dt><dd>약관 위반, 허위 기관·자격 정보, 개인정보 침해가 확인되면 게시물 또는 계정 이용을 제한할 수 있습니다.</dd></div>
    </dl>
    <p className="signup-legal-notice">정식 운영 약관은 사업자 정보, 유료서비스 및 분쟁처리 기준을 법무 검토한 뒤 시행일과 함께 게시합니다.</p>
  </>;
}

function PrivacyCopy({ memberType }) {
  return <>
    <h4>개인정보 수집·이용 안내</h4>
    <dl>
      <div><dt>수집 목적</dt><dd>회원 식별, 본인확인, 계정 보안, 상담·채용 서비스 제공, 문의와 결제내역 관리</dd></div>
      <div><dt>필수 항목</dt><dd>이름, 휴대폰 번호, 이메일, 회원 유형, 가입·약관 동의 기록{memberType === 'hospital' ? ', 담당자 직책, 병원명, 기관 유형, 대표자명, 대표전화, 주소' : ''}</dd></div>
      <div><dt>보유 기간</dt><dd>회원 탈퇴 시까지 보관하며, 결제·계약 등 관계 법령상 보존 의무가 있는 기록은 해당 기간 동안 분리 보관합니다.</dd></div>
      <div><dt>동의 거부</dt><dd>동의를 거부할 수 있으나 필수정보 수집에 동의하지 않으면 회원가입과 계정 기반 서비스를 이용할 수 없습니다.</dd></div>
    </dl>
    <p className="signup-legal-notice">주민등록번호, 면허·자격 서류, 사업자등록증 원본과 마케팅 수신 동의는 가입 단계에서 받지 않습니다.</p>
  </>;
}

// 실제 계정을 만들지 않으며, 어떤 개인정보도 브라우저에 저장하지 않습니다.
function SignupApplicationForm({ memberType }) {
  const content = roleContent[memberType];
  const RoleIcon = content.icon;
  const fields = useMemo(() => fieldsForRole(memberType), [memberType]);
  const [draft, setDraft] = useState(() => createEmptyDraft(memberType));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [phoneVerificationPrepared, setPhoneVerificationPrepared] = useState(false);
  const formRef = useRef(null);

  const setField = (field, value) => {
    const nextValue = FIELD_META[field]?.phone ? formatKoreanPhone(value) : value;
    if (field === 'phone') setPhoneVerificationPrepared(false);
    setDraft((current) => {
      const next = { ...current, [field]: nextValue };
      if (submittedOnce || touched[field]) {
        setErrors((currentErrors) => {
          const updated = { ...currentErrors, [field]: validateField(field, next) };
          // 비밀번호가 바뀌면 확인 필드 검증도 함께 갱신합니다.
          if (field === 'password' && (submittedOnce || touched.passwordConfirm)) updated.passwordConfirm = validateField('passwordConfirm', next);
          return updated;
        });
      }
      return next;
    });
  };

  const blurField = (field) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors((current) => ({ ...current, [field]: validateField(field, draft) }));
  };

  const preparePhoneVerification = () => {
    const phoneError = validateField('phone', draft);
    setTouched((current) => ({ ...current, phone: true }));
    setErrors((current) => ({ ...current, phone: phoneError }));
    if (!phoneError) setPhoneVerificationPrepared(true);
  };

  const toggleConsent = (key, value) => {
    setDraft((current) => {
      const next = { ...current, [key]: value === true };
      if (submittedOnce) setErrors((currentErrors) => ({ ...currentErrors, [key]: value === true ? '' : currentErrors[key] }));
      return next;
    });
  };

  const toggleAllConsents = (value) => {
    setDraft((current) => {
      const next = setAllConsents(current, value);
      if (submittedOnce) setErrors((currentErrors) => ({
        ...currentErrors,
        termsAccepted: value ? '' : currentErrors.termsAccepted,
        privacyAccepted: value ? '' : currentErrors.privacyAccepted,
        ageConfirmed: value ? '' : currentErrors.ageConfirmed
      }));
      return next;
    });
  };

  const submit = (event) => {
    event.preventDefault();
    setSubmittedOnce(true);
    const validation = validateApplicationDraft(draft, memberType);
    setErrors(validation.errors);
    if (!validation.valid) {
      const firstInvalid = [...fields, 'termsAccepted', 'privacyAccepted', 'ageConfirmed'].find((key) => validation.errors[key]);
      // id 는 `signup-<role>-<field>` 형태로 항상 안전한 문자만 사용하므로 CSS.escape 없이 getElementById 로 직접 찾습니다.
      // (일부 구형 브라우저는 CSS.escape 를 지원하지 않습니다.)
      const node = firstInvalid && document.getElementById(`signup-${memberType}-${firstInvalid}`);
      node?.focus?.();
      return;
    }
    // 프론트엔드 전용 완료: 계정 유형만 남기고 이름·연락처·이메일·비밀번호 등 모든 민감 정보를 즉시 비웁니다.
    setCompleted(true);
    setDraft((current) => clearDraftFields(current));
    setErrors({});
    setTouched({});
    setSubmittedOnce(false);
    setPhoneVerificationPrepared(false);
  };

  const resetForm = () => {
    setCompleted(false);
    setDraft((current) => clearDraftFields(current));
    setErrors({});
    setTouched({});
    setSubmittedOnce(false);
    setPhoneVerificationPrepared(false);
  };

  if (completed) {
    return <section className="signup-card signup-complete-draft">
      <span className="account-check"><CircleCheck /></span>
      <small>DRAFT CHECK COMPLETE</small>
      <h2>가입 양식 확인 완료</h2>
      <p>입력하신 항목이 형식에 맞는지 확인했습니다. 아직 실제 계정은 만들어지지 않았습니다.</p>
      <div className="signup-launch-boundary"><LockKeyhole /><span><strong>정식 오픈 시 휴대폰 본인확인과 연결됩니다.</strong><small>본인확인기관이 제공하는 중복가입 방지정보를 서버에서 확인한 뒤 계정을 생성합니다.</small></span></div>
      <dl>
        <div><dt>선택한 회원 유형</dt><dd>{content.label}</dd></div>
        <div><dt>저장된 개인정보</dt><dd>없음</dd></div>
      </dl>
      <p className="signup-nostore-line"><ShieldCheck /> 이름·연락처·이메일·비밀번호를 포함한 어떤 개인정보도 이 브라우저에 저장하지 않았습니다.</p>
      <div className="account-actions">
        <a className="button primary" href={withBase(memberType === 'doctor' ? '/jobs' : '/talent')}>먼저 둘러보기 <ArrowRight /></a>
        <button type="button" className="button outline" onClick={resetForm}><RotateCcw size={15} /> 새 양식 작성</button>
      </div>
    </section>;
  }

  const consentError = submittedOnce && (errors.termsAccepted || errors.privacyAccepted || errors.ageConfirmed);
  const renderMeta = (field) => field === 'name' && memberType === 'doctor' ? { ...FIELD_META[field], label: '이름' } : FIELD_META[field];
  const renderField = (field) => field === 'phone' ? <PhoneVerificationField
    key={field}
    fieldId={`signup-${memberType}-${field}`}
    meta={renderMeta(field)}
    value={draft[field]}
    error={submittedOnce || touched[field] ? errors[field] : ''}
    prepared={phoneVerificationPrepared}
    onChange={(value) => setField(field, value)}
    onBlur={() => blurField(field)}
    onRequest={preparePhoneVerification}
  /> : <SignupField
    key={field}
    fieldId={`signup-${memberType}-${field}`}
    meta={renderMeta(field)}
    value={draft[field]}
    error={submittedOnce || touched[field] ? errors[field] : ''}
    onChange={(value) => setField(field, value)}
    onBlur={() => blurField(field)}
  />;

  return <section className="signup-card signup-application">
    <div className={`signup-fixed-role ${memberType}`}><span><RoleIcon /></span><div><small>선택한 회원 유형</small><strong>{content.label}</strong></div><CircleCheck /></div>
    <span className="signup-draft-tag"><Sparkles size={13} /> 정식 오픈 전 가입 신청 미리 작성</span>
    <h2>{content.label} 가입 신청서</h2>
    <p>{memberType === 'hospital' ? '채용 담당자 계정과 병원 기본정보를 한 번에 등록합니다. 기관 서류는 가입 후 공고 등록이나 결제 전에 별도 확인합니다.' : '정식 오픈 전에 미리 작성해볼 수 있는 화면입니다. 실제 계정 생성과 본인인증은 정식 오픈 시 연결되며, 지금 입력한 내용은 저장되지 않습니다.'}</p>
    <form ref={formRef} onSubmit={submit} noValidate>
      {memberType === 'hospital' ? <>
        <section className="signup-form-section">
          <header><span>01</span><div><h3>담당자 계정</h3><p>공고·문의·결제 알림을 실제로 받을 담당자 정보를 입력해주세요.</p></div></header>
          <div className="signup-field-grid">{hospitalAccountFields().map(renderField)}</div>
        </section>
        <section className="signup-form-section hospital-info-section">
          <header><span>02</span><div><h3>병원·기관 정보</h3><p>의사가 신뢰할 수 있는 공고와 기관 인증에 필요한 기본정보입니다.</p></div></header>
          <div className="signup-field-grid">{hospitalInfoFields().map(renderField)}</div>
          <div className="hospital-verification-note"><ShieldCheck /><span><strong>병원 서류는 지금 올리지 않아도 됩니다</strong><small>사업자등록증·의료기관 개설 관련 서류는 공고 등록이나 결제가 필요한 시점에 안전하게 확인합니다.</small></span></div>
        </section>
      </> : <div className="signup-field-grid">{fields.map(renderField)}</div>}

      <div className="signup-consent-block">
        <label className="signup-consent-all">
          <input type="checkbox" checked={allConsentsAccepted(draft)} onChange={(event) => toggleAllConsents(event.target.checked)} />
          <span><b>전체 동의</b> 아래 필수 항목에 한 번에 동의합니다. (마케팅 수신 동의는 포함되지 않습니다.)</span>
        </label>
        <div className="signup-agreements">
          <AgreementItem id={`signup-${memberType}-termsAccepted`} checked={draft.termsAccepted} onChange={(value) => toggleConsent('termsAccepted', value)} title="서비스 이용약관">
            <TermsCopy />
          </AgreementItem>
          <AgreementItem id={`signup-${memberType}-privacyAccepted`} checked={draft.privacyAccepted} onChange={(value) => toggleConsent('privacyAccepted', value)} title="개인정보 수집·이용">
            <PrivacyCopy memberType={memberType} />
          </AgreementItem>
          <label className="signup-age-confirm">
            <input id={`signup-${memberType}-ageConfirmed`} type="checkbox" checked={draft.ageConfirmed} onChange={(event) => toggleConsent('ageConfirmed', event.target.checked)} aria-invalid={submittedOnce && errors.ageConfirmed ? 'true' : undefined} />
            <span><b>필수</b><strong>만 14세 이상임을 확인합니다.</strong></span>
          </label>
          {consentError && <em role="alert">필수 동의 항목을 모두 확인해주세요.</em>}
        </div>
        <div className="signup-no-marketing"><CircleCheck /><span><strong>마케팅 수신 동의는 받지 않습니다</strong><small>가입에 필수가 아니며 수집하지 않습니다. 광고성 알림은 정식 가입 후 원할 때만 별도로 선택할 수 있습니다.</small></span></div>
      </div>

      <button className="button primary full" type="submit">가입 양식 확인하기 <ArrowRight /></button>
      <p className="signup-nostore-line"><ShieldCheck /> 입력값은 이 화면에서만 임시로 쓰이고 저장되지 않습니다. 확인 후 즉시 비워집니다.</p>
      <a className="signup-switch-type" href={withBase(memberType === 'doctor' ? '/signup/hospital' : '/signup/doctor')}>대신 {memberType === 'doctor' ? '병원 회원' : '의사 회원'}으로 작성</a>
    </form>
  </section>;
}

function SignedOutCard({ memberType }) {
  const content = roleContent[memberType];
  const RoleIcon = content.icon;
  return <section className="signup-card">
    <span className="signup-card-icon"><RoleIcon /></span>
    <small>{content.eyebrow}</small>
    <h2>{content.label} 계정 인증</h2>
    <p>{content.description} 메디헬퍼스가 비밀번호를 별도로 수집하지 않도록 안전한 계정 인증을 사용합니다.</p>
    <a className="button primary full signup-provider" href={withBase(`/signin-with-chatgpt?return_to=${withBase(`/signup/${memberType}`)}`)}>
      {content.label}으로 계속 <ArrowRight />
    </a>
    <a className="signup-recovery-link" href={withBase('/account/recovery')}>아이디·로그인 정보를 잊으셨나요?</a>
    <div className="signup-security-copy"><ShieldCheck /> 주민등록번호를 직접 받지 않고 휴대폰 본인확인 결과로 가입자를 확인합니다.</div>
    <a className="signup-switch-type" href={withBase(memberType === 'doctor' ? '/signup/hospital' : '/signup/doctor')}>대신 {memberType === 'doctor' ? '병원 회원' : '의사 회원'}으로 가입</a>
  </section>;
}

// 실제 가입 경로(signupEnabled=true, 인증 완료)에서만 사용합니다.
// 백엔드 /api/account 계약은 회원 유형과 필수 동의만 받으므로, 프론트엔드 신청서의
// 비밀번호 초안 등은 전송하지 않습니다. 라이브 계정 모델을 그대로 유지합니다.
function SignupForm({ identity, memberType, onComplete }) {
  const content = roleContent[memberType];
  const RoleIcon = content.icon;
  const [form, setForm] = useState(() => initialForm(memberType));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    const validation = validateSignup(form);
    setErrors(validation.errors);
    setSubmitError('');
    if (!validation.valid) return;
    setSubmitting(true);
    try {
      const result = await accountRequest('POST', form);
      onComplete(result.account);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };
  return <section className="signup-card signup-form-card">
    <div className="signup-identity"><span><BadgeCheck /></span><div><small>인증된 계정</small><strong>{identity.displayName || identity.email || '인증 완료'}</strong></div></div>
    <h2>{content.label}으로 가입합니다</h2>
    <p>{content.description} 자격이나 기관 확인은 해당 기능을 사용할 때 별도로 진행합니다.</p>
    <form onSubmit={submit} noValidate>
      <div className={`signup-fixed-role ${memberType}`}><span><RoleIcon /></span><div><small>선택한 회원 유형</small><strong>{content.label}</strong></div><CircleCheck /></div>
      <div className="signup-agreements">
        <AgreementItem id={`live-${memberType}-termsAccepted`} checked={form.termsAccepted} onChange={(value) => update('termsAccepted', value)} title="서비스 이용약관">
          <TermsCopy />
        </AgreementItem>
        <AgreementItem id={`live-${memberType}-privacyAcknowledged`} checked={form.privacyAcknowledged} onChange={(value) => update('privacyAcknowledged', value)} title="개인정보 수집·이용" confirmation="안내를 확인하고 동의합니다">
          <PrivacyCopy memberType={memberType} />
        </AgreementItem>
        <label className="signup-age-confirm"><input type="checkbox" checked={form.ageConfirmed} onChange={(event) => update('ageConfirmed', event.target.checked)} /><span><b>필수</b><strong>만 14세 이상임을 확인합니다.</strong></span></label>
        {(errors.termsAccepted || errors.ageConfirmed || errors.privacyAcknowledged) && <em>필수 약관과 안내를 확인해주세요.</em>}
      </div>
      <div className="signup-no-marketing"><CircleCheck /><span><strong>광고 수신 동의는 받지 않습니다</strong><small>마케팅 알림은 가입 후 원할 때만 별도로 선택할 수 있습니다.</small></span></div>
      {submitError && <p className="signup-error" role="alert">{submitError}</p>}
      <button className="button primary full" type="submit" disabled={submitting}>{submitting ? <><LoaderCircle className="spin" /> 가입 처리 중</> : <>최소 정보로 가입 완료 <ArrowRight /></>}</button>
      <a className="signup-switch-type" href={withBase(memberType === 'doctor' ? '/signup/hospital' : '/signup/doctor')}>회원 유형 다시 선택</a>
    </form>
  </section>;
}

function AccountCard({ account, identity, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const remove = async () => {
    if (!window.confirm('메디헬퍼스 계정을 삭제할까요? 자격 확인 자료가 없는 현재 계정 정보는 즉시 삭제됩니다.')) return;
    setDeleting(true);
    try {
      await accountRequest('DELETE');
      onDeleted();
    } finally {
      setDeleting(false);
    }
  };
  return <section className="signup-card account-complete">
    <span className="account-check"><CircleCheck /></span>
    <small>WELCOME TO MEDIHELPERS</small>
    <h2>가입이 완료되었습니다</h2>
    <p>{identity.displayName || identity.email || '회원'}님, 필요한 기능을 사용할 때만 추가 정보를 요청하겠습니다.</p>
    <dl><div><dt>회원 유형</dt><dd>{accountRoleLabel(account.role)}</dd></div><div><dt>가입 상태</dt><dd>기본 회원</dd></div><div><dt>마케팅 수신</dt><dd>미동의</dd></div></dl>
    <div className="account-actions"><a className="button primary" href={withBase('/mypage')}>마이페이지 열기 <ArrowRight /></a><a className="button outline" href={withBase(`/signout-with-chatgpt?return_to=${withBase('/')}`)}>로그아웃</a></div>
    <button className="account-delete" type="button" onClick={remove} disabled={deleting}>{deleting ? '삭제 중…' : '계정 삭제'}</button>
  </section>;
}

function SignupPrinciples({ memberType, previewMode }) {
  const content = roleContent[memberType];
  return <aside className="signup-principles">
    <h3>가입할 때 받지 않는 정보</h3>
    <ul>
      <li><Check /> 주민등록번호</li>
      <li><Check /> 면허·자격 서류</li>
      <li><Check /> 사업자등록증 등 기관 서류</li>
      <li><Check /> 마케팅 수신 동의</li>
    </ul>
    {previewMode && <div className="signup-principles-note">
      <strong>지금 입력하는 정보는 어디에도 저장되지 않습니다</strong>
      <p>정식 서버 연동 전까지 이름·연락처·이메일·비밀번호{memberType === 'hospital' ? '·병원명·담당자 역할' : ''} 같은 신청 항목은 화면에서만 임시로 쓰이고, 브라우저(localStorage 등)에 남기지 않습니다.</p>
    </div>}
    {content ? <div className="signup-after-check"><strong>{content.afterTitle}</strong><p>{content.afterCopy}</p></div> : <p>회원 유형을 먼저 선택하면 각각의 확인 절차를 안내합니다.</p>}
  </aside>;
}

export default function AccountPage({ memberType = '' }) {
  const [state, setState] = useState({ loading: true, signupEnabled: false, signedIn: false, account: null, identity: {} });
  const [error, setError] = useState('');
  const title = useMemo(() => state.account ? '내 계정' : roleContent[memberType]?.title || '회원가입', [memberType, state.account]);
  useEffect(() => {
    accountRequest().then((data) => setState({ loading: false, ...data })).catch((loadError) => {
      if (loadError.code !== 'STATIC_HOSTING') setError(loadError.message);
      setState((current) => ({ ...current, loading: false }));
    });
  }, []);
  // 프론트엔드 전용 신청 폼을 보여주는 조건: 회원 유형이 선택됐고, 백엔드 회원가입이 아직 열리지 않은 상태.
  const previewMode = Boolean(memberType) && !state.loading && !state.account && !state.signupEnabled;
  let content;
  if (state.loading) content = <section className="signup-card signup-loading" role="status" aria-live="polite"><LoaderCircle className="spin" aria-hidden="true" /><strong>안전한 가입 상태를 확인하고 있습니다</strong></section>;
  else if (state.account) content = <AccountCard account={state.account} identity={state.identity} onDeleted={() => setState((current) => ({ ...current, account: null }))} />;
  else if (!memberType) content = <MemberTypeChooser />;
  else if (!state.signupEnabled) content = <SignupApplicationForm memberType={memberType} />;
  else if (!state.signedIn) content = <SignedOutCard memberType={memberType} />;
  else content = <SignupForm identity={state.identity} memberType={memberType} onComplete={(account) => setState((current) => ({ ...current, account }))} />;
  return <div className="signup-page">
    <header className="signup-hero"><span><LockKeyhole /> {roleContent[memberType]?.eyebrow || 'MINIMUM DATA ACCOUNT'}</span><h1>{title}</h1><p>{roleContent[memberType]?.description || '의사 회원과 병원 회원을 구분해 필요한 기능과 확인 절차만 제공합니다.'}</p></header>
    <div className="signup-shell">{error && <p className="signup-environment-note" role="alert">{error}</p>}{content}<SignupPrinciples memberType={memberType} previewMode={previewMode} /></div>
  </div>;
}
