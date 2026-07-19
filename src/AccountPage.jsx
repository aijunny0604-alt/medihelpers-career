import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, BadgeCheck, Building2, Check, CircleCheck, LoaderCircle,
  LockKeyhole, RotateCcw, ShieldAlert, ShieldCheck, Sparkles, Stethoscope, UserRound
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
  individualAccountFields,
  individualProfileFields,
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
    label: '일반 회원',
    eyebrow: 'INDIVIDUAL MEMBER',
    title: '일반 회원가입',
    description: '의사·의료인 채용정보 탐색과 비공개 이직 상담을 위한 개인 계정입니다.',
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
  professionType: {
    label: '의료 직군',
    type: 'select',
    placeholder: '직군을 선택해주세요',
    options: ['의사', '치과의사', '한의사', '간호사', '간호조무사', '방사선사', '임상병리사', '물리치료사', '작업치료사', '치과위생사', '병원 행정·원무', '기타 의료인']
  },
  specialty: { label: '전문 분야·주요 업무', type: 'text', placeholder: '예: 정형외과 전문의, MRI 방사선사, 외래 간호' },
  region: {
    label: '현재 활동 지역',
    type: 'select',
    placeholder: '지역을 선택해주세요',
    options: ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '전국·해외']
  },
  birthYear: { label: '출생연도', optional: true, type: 'number', inputMode: 'numeric', placeholder: '예: 1985', hint: '기본 가입에는 필수가 아니며 이력서에서 나중에 입력할 수 있습니다.' },
  gender: { label: '성별', optional: true, type: 'select', placeholder: '선택하지 않음', options: ['남성', '여성', '직접 밝히지 않음'] },
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

async function authRequest(action, body = {}) {
  const response = await fetch(`/api/auth/${action}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || '로그인 요청을 처리하지 못했습니다.');
  return data;
}

function MemberTypeChooser() {
  return <section className="signup-card member-type-card">
    <span className="signup-card-icon"><UserRound /></span>
    <small>CHOOSE YOUR ACCOUNT</small>
    <h2>회원 유형을 선택해주세요</h2>
    <p>개인 구직자와 병원 채용 담당자는 이용 목적과 확인 절차가 달라 계정을 구분해 운영합니다.</p>
    <div className="member-type-grid">
      <a className="doctor-choice" href={withBase('/signup/doctor')}><span><Stethoscope /></span><div><small>INDIVIDUAL · 일반 회원</small><strong>채용정보를 찾고 있어요</strong><p>의사·의료인 채용정보 · 비공개 상담 · 이력서 관리</p><b>일반 회원으로 시작하기 <ArrowRight /></b></div></a>
      <a className="hospital-choice" href={withBase('/signup/hospital')}><span><Building2 /></span><div><small>HOSPITAL · 병원 회원</small><strong>의사를 채용하고 싶어요</strong><p>초빙공고 등록 · 후보 추천 · 채용 진행 관리</p><b>병원 회원으로 시작하기 <ArrowRight /></b></div></a>
    </div>
    <div className="signup-existing-account">이미 메디헬퍼스 계정이 있으신가요? <a href={withBase('/login')}>이메일로 로그인</a></div>
    <div className="signup-security-copy"><ShieldCheck /> 주민등록번호를 받지 않고, 인증된 계정과 본인 명의 휴대폰 확인으로 중복 가입을 방지합니다.</div>
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
    {prepared && <div className="phone-verification-preview" role="status"><ShieldCheck /><span><strong>휴대폰 본인확인 단계가 준비되었습니다</strong><small>가입 양식 확인 후 안전한 계정 인증과 본인 명의 휴대폰 확인이 이어집니다.</small></span></div>}
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
    <h4>서비스 이용약관 필수 안내</h4>
    <dl>
      <div><dt>서비스 범위</dt><dd>의사·의료인 채용정보, 인재정보, 비공개 이직상담, 병원 채용의뢰 및 관련 관리 서비스를 제공합니다.</dd></div>
      <div><dt>계정과 인증</dt><dd>계정은 가입자 본인 또는 등록된 병원 담당자만 사용할 수 있습니다. 의료인 자격·병원 인증이 필요한 기능은 별도 확인 후 이용 권한을 부여합니다.</dd></div>
      <div><dt>이용자 의무</dt><dd>허위 공고, 타인의 정보 도용, 무단 연락처 수집·판매, 후보자 동의 없는 개인정보 전달을 금지합니다.</dd></div>
      <div><dt>유료 서비스</dt><dd>공고·열람·채용 상품의 금액, 제공기간, 청약철회·환불조건은 결제 전에 별도로 안내하고 확인을 받습니다.</dd></div>
      <div><dt>서비스 제한</dt><dd>약관 위반, 허위 기관·자격 정보, 개인정보 침해가 확인되면 게시물 또는 계정 이용을 제한할 수 있습니다.</dd></div>
      <div><dt>시행일</dt><dd>2026년 7월 18일 (이용약관 v1.0)</dd></div>
    </dl>
    <p className="signup-legal-notice"><b>운영자: 메디헬퍼스 대표 이형석</b> 사업자등록번호 873-92-00515 · 직업정보제공사업 부산북부지청 제2017-1호. 가입 전에 <a href={withBase('/terms')} target="_blank" rel="noreferrer">이용약관 전문</a>을 확인할 수 있습니다.</p>
  </>;
}

function PrivacyCopy({ memberType }) {
  return <>
    <h4>개인정보 수집·이용 안내</h4>
    <dl>
      <div><dt>수집 목적</dt><dd>회원 식별과 본인확인, 계정 보안, 상담·채용 서비스 제공, 문의 처리, 결제·계약 내역 관리</dd></div>
      <div><dt>필수 항목</dt><dd>이름, 휴대폰 번호, 이메일, 회원 유형, 가입·약관 동의 일시와 버전{memberType === 'hospital' ? ', 담당자 직책, 병원명, 기관 유형, 대표자명, 대표전화, 주소' : ', 의료 직군, 전문 분야, 활동 지역'}</dd></div>
      <div><dt>보유 기간</dt><dd>회원정보는 탈퇴 시까지, 상담·채용 연결 기록은 상담 종료 후 3년까지 보유합니다. 계약·결제 기록은 관계 법령에 따라 5년, 소비자 불만·분쟁처리 기록은 3년간 분리 보관합니다.</dd></div>
      <div><dt>동의 거부</dt><dd>동의를 거부할 수 있으나 필수정보 수집에 동의하지 않으면 회원가입과 계정 기반 서비스를 이용할 수 없습니다.</dd></div>
      <div><dt>선택 정보</dt><dd>출생연도와 성별은 선택 항목이며 입력하지 않아도 가입할 수 있습니다. 광고성 정보 수신 동의도 가입 필수 동의와 분리해 별도로 받습니다.</dd></div>
    </dl>
    <p className="signup-legal-notice"><b>개인정보 보호책임자: 이형석</b> hr@medihelpers.co.kr · 051-342-5463. 주민등록번호와 면허·자격·사업자등록증 원본은 가입 단계에서 수집하지 않습니다. <a href={withBase('/privacy')} target="_blank" rel="noreferrer">개인정보처리방침 전문</a>에서 처리위탁, 제3자 제공, 파기와 권리 행사 방법을 확인할 수 있습니다.</p>
  </>;
}

// 실제 계정을 만들지 않으며, 어떤 개인정보도 브라우저에 저장하지 않습니다.
function SignupApplicationForm({ memberType, signedIn, onComplete }) {
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

  const submit = async (event) => {
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
    if (signedIn) {
      try {
        const result = await accountRequest('POST', {
          role: memberType,
          termsAccepted: true,
          privacyAcknowledged: true,
          ageConfirmed: true
        });
        onComplete(result.account);
        return;
      } catch (requestError) {
        setErrors((current) => ({ ...current, submit: requestError.message }));
        return;
      }
    }
    try {
      const result = await authRequest('register', {
        role: memberType,
        email: draft.email,
        password: draft.password,
        displayName: draft.name,
        phone: draft.phone,
        hospitalName: draft.hospitalName,
        hospitalRole: draft.hospitalRole,
        professionType: draft.professionType,
        specialty: draft.specialty,
        termsAccepted: true,
        privacyAcknowledged: true,
        ageConfirmed: true
      });
      setDraft((current) => clearDraftFields(current));
      onComplete(result.account, result.identity);
    } catch (requestError) {
      setErrors((current) => ({ ...current, submit: requestError.message }));
    }
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
      <small>FINAL ACCOUNT VERIFICATION</small>
      <h2>마지막 계정 인증만 남았습니다</h2>
      <p>가입 양식과 필수 동의를 확인했습니다. 안전한 계정 인증을 완료하면 회원 계정이 생성됩니다.</p>
      <div className="signup-launch-boundary"><LockKeyhole /><span><strong>비밀번호는 안전한 단방향 해시로 보호합니다.</strong><small>이메일 계정으로 중복 가입을 확인하고 회원 유형과 동의 기록을 안전하게 저장합니다.</small></span></div>
      <dl>
        <div><dt>선택한 회원 유형</dt><dd>{content.label}</dd></div>
        <div><dt>다음 단계</dt><dd>계정 인증 후 가입 완료</dd></div>
      </dl>
      <div className="account-actions">
        <a className="button primary" href={withBase('/login')}>메디헬퍼스 로그인 <ArrowRight /></a>
        <button type="button" className="button outline" onClick={resetForm}><RotateCcw size={15} /> 입력 내용 수정</button>
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
    <h2>{content.label} 가입</h2>
    <p>{memberType === 'hospital' ? '채용 담당자 계정과 병원 기본정보를 한 번에 등록합니다. 기관 서류는 가입 후 공고 등록이나 결제 전에 별도 확인합니다.' : '계정 정보와 의료 직군을 먼저 등록합니다. 면허·자격과 경력 상세정보는 가입 후 이력서 또는 인증 단계에서 추가할 수 있습니다.'}</p>
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
      </> : <>
        <section className="signup-form-section individual-account-section">
          <header><span>01</span><div><h3>개인 계정</h3><p>로그인과 본인확인, 상담 연락에 사용할 기본정보입니다.</p></div></header>
          <div className="signup-field-grid">{individualAccountFields().map(renderField)}</div>
        </section>
        <section className="signup-form-section individual-profile-section">
          <header><span>02</span><div><h3>의료 직군·활동정보</h3><p>맞춤 채용정보와 상담 연결에 필요한 최소 경력정보만 입력해주세요.</p></div></header>
          <div className="signup-field-grid">{individualProfileFields().map(renderField)}</div>
          <div className="hospital-verification-note individual-verification-note"><ShieldCheck /><span><strong>자격서류는 가입 후 필요할 때만 확인합니다</strong><small>면허번호·자격증·경력증명서는 이력서 공개 또는 채용 연결 단계에서 본인 동의 후 안전하게 확인합니다.</small></span></div>
        </section>
      </>}

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

      {errors.submit && <p className="signup-error" role="alert">{errors.submit}</p>}
      <button className="button primary full" type="submit">{signedIn ? '가입 완료하기' : '계속해서 계정 인증'} <ArrowRight /></button>
      <a className="signup-switch-type" href={withBase(memberType === 'doctor' ? '/signup/hospital' : '/signup/doctor')}>대신 {memberType === 'doctor' ? '병원 회원' : '일반 회원'}으로 작성</a>
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
    <p>{content.description} 메디헬퍼스 자체 이메일 계정으로 안전하게 로그인합니다.</p>
    <a className="button primary full signup-provider" href={withBase('/login')}>
      {content.label}으로 계속 <ArrowRight />
    </a>
    <a className="signup-recovery-link" href={withBase('/account/recovery')}>아이디·로그인 정보를 잊으셨나요?</a>
    <div className="signup-security-copy"><ShieldCheck /> 주민등록번호를 직접 받지 않고 휴대폰 본인확인 결과로 가입자를 확인합니다.</div>
    <a className="signup-switch-type" href={withBase(memberType === 'doctor' ? '/signup/hospital' : '/signup/doctor')}>대신 {memberType === 'doctor' ? '병원 회원' : '일반 회원'}으로 가입</a>
  </section>;
}

function LoginCard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authRequest('login', { email, password });
      const requested = new URLSearchParams(window.location.search).get('next') || '/mypage';
      window.location.href = withBase(requested.startsWith('/') && !requested.startsWith('//') ? requested : '/mypage');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };
  return <section className="signup-card signup-login-card">
    <span className="signup-card-icon"><LockKeyhole /></span>
    <small>MEDIHELPERS ACCOUNT</small>
    <h2>메디헬퍼스 로그인</h2>
    <p>OpenAI 계정이 아닌 메디헬퍼스 이메일과 비밀번호로 로그인합니다.</p>
    <form onSubmit={submit}>
      <label><span>이메일</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="example@email.com" required /></label>
      <label><span>비밀번호</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호를 입력해주세요" minLength={8} maxLength={128} required /></label>
      {error && <p className="signup-error" role="alert">{error}</p>}
      <button className="button primary full" type="submit" disabled={submitting}>{submitting ? <><LoaderCircle className="spin" /> 로그인 중</> : <>로그인 <ArrowRight /></>}</button>
    </form>
    <a className="signup-recovery-link" href={withBase('/account/recovery')}>비밀번호를 잊으셨나요?</a>
    <div className="signup-login-join"><span>아직 계정이 없으신가요?</span><a href={withBase('/signup')}>회원 유형을 선택하고 가입하기</a></div>
    <div className="signup-security-copy"><ShieldCheck /> 로그인 세션은 보안 쿠키로 보호되며 비밀번호 원문은 저장하지 않습니다.</div>
  </section>;
}

// 실제 가입 경로(signupEnabled=true, 인증 완료)에서만 사용합니다.
// 백엔드 /api/account 계약은 회원 유형과 필수 동의만 받으므로, 프론트엔드 신청서의
// 비밀번호 초안 등은 전송하지 않습니다. 라이브 계정 모델을 그대로 유지합니다.
function SignupForm({ identity = {}, memberType, onComplete }) {
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

function AccountCard({ account, identity = {} }) {
  const signOut = async () => {
    try { await authRequest('logout'); } finally { window.location.href = withBase('/'); }
  };
  return <section className="signup-card account-complete">
    <span className="account-check"><CircleCheck /></span>
    <small>WELCOME TO MEDIHELPERS</small>
    <h2>가입이 완료되었습니다</h2>
    <p>{identity.displayName || identity.email || '회원'}님, 필요한 기능을 사용할 때만 추가 정보를 요청하겠습니다.</p>
    <dl><div><dt>회원 유형</dt><dd>{accountRoleLabel(account.role)}</dd></div><div><dt>가입 상태</dt><dd>기본 회원</dd></div><div><dt>마케팅 수신</dt><dd>미동의</dd></div></dl>
    <div className="account-actions"><a className="button primary" href={withBase('/mypage')}>마이페이지 열기 <ArrowRight /></a><button className="button outline" type="button" onClick={signOut}>로그아웃</button></div>
  </section>;
}

// 회원 탈퇴 안내·동의·실행 UI. 마이페이지 회원정보 탭에서 사용(가입 완료 화면과 분리).
export function WithdrawSection({ onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const remove = async () => {
    if (!agreed) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await accountRequest('DELETE');
      if (onDeleted) onDeleted();
      else window.location.href = withBase('/');
    } catch (error) {
      setDeleteError(error.message || '계정 삭제를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setDeleting(false);
    }
  };
  return <section className="member-panel member-withdraw">
    <div className="member-panel-head"><div><h3>회원 탈퇴</h3><p>계정과 개인정보를 삭제합니다. 신중히 진행해 주세요.</p></div></div>
    {!confirmOpen
      ? <button className="account-delete" type="button" onClick={() => { setConfirmOpen(true); setAgreed(false); setDeleteError(''); }}>회원 탈퇴 진행</button>
      : <div className="account-withdraw" role="group" aria-label="회원 탈퇴 안내 및 동의">
          <div className="account-withdraw-head"><ShieldAlert /><strong>회원 탈퇴 전 확인해 주세요</strong></div>
          <p className="account-withdraw-lead">탈퇴하면 아래와 같이 처리되며, 개인정보 삭제는 <b>되돌릴 수 없습니다</b>.</p>
          <div className="account-withdraw-grid">
            <div className="account-withdraw-item delete"><small>즉시 삭제</small><p>이름·연락처·이메일·소속 등 회원 개인정보와 동의 기록. 등록한 이력서·프로필은 공개가 중단되고 파기됩니다.</p></div>
            <div className="account-withdraw-item keep"><small>법령상 분리 보관</small><p>결제·거래·계약 및 청약철회에 관한 기록은 「전자상거래 등에서의 소비자보호에 관한 법률」에 따라 <b>5년간</b> 다른 정보와 분리해 보관 후 파기합니다.</p></div>
          </div>
          <p className="account-withdraw-note">보유·파기 기준은 <a href={withBase('/privacy')} target="_blank" rel="noreferrer">개인정보처리방침</a>과 <a href={withBase('/withdrawal')} target="_blank" rel="noreferrer">회원 탈퇴 약관</a>을 따릅니다. 진행 중인 결제·상담·채용 건이 있으면 종료 후 처리될 수 있습니다.</p>
          <label className="account-withdraw-consent"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /><span>위 안내를 확인했으며, 회원 탈퇴 및 개인정보 삭제에 동의합니다.</span></label>
          {deleteError && <p className="form-error" role="alert">{deleteError}</p>}
          <div className="account-withdraw-actions">
            <button type="button" className="button outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>취소</button>
            <button type="button" className="button danger" onClick={remove} disabled={!agreed || deleting}>{deleting ? '탈퇴 처리 중…' : '동의하고 탈퇴'}</button>
          </div>
        </div>}
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

export default function AccountPage({ memberType = '', loginOnly = false }) {
  const [state, setState] = useState({ loading: true, signupEnabled: false, signedIn: false, account: null, identity: {} });
  const [error, setError] = useState('');
  const title = useMemo(() => state.account ? '내 계정' : loginOnly ? '로그인' : roleContent[memberType]?.title || '회원가입', [memberType, state.account, loginOnly]);
  useEffect(() => {
    accountRequest().then((data) => setState({ loading: false, ...data })).catch((loadError) => {
      if (loadError.code !== 'STATIC_HOSTING') setError(loadError.message);
      setState((current) => ({ ...current, loading: false }));
    });
  }, []);
  let content;
  if (state.loading) content = <section className="signup-card signup-loading" role="status" aria-live="polite"><LoaderCircle className="spin" aria-hidden="true" /><strong>안전한 가입 상태를 확인하고 있습니다</strong></section>;
  else if (state.account) content = <AccountCard account={state.account} identity={state.identity} />;
  else if (loginOnly) content = <LoginCard />;
  else if (!memberType) content = <MemberTypeChooser />;
  else content = <SignupApplicationForm memberType={memberType} signedIn={state.signedIn} onComplete={(account, identity) => setState((current) => ({ ...current, account, identity:identity || current.identity, signedIn:true }))} />;
  return <div className="signup-page">
    <header className="signup-hero"><span><LockKeyhole /> {roleContent[memberType]?.eyebrow || 'MINIMUM DATA ACCOUNT'}</span><h1>{title}</h1><p>{roleContent[memberType]?.description || '일반 회원과 병원 회원을 구분해 필요한 기능과 확인 절차만 제공합니다.'}</p></header>
    <div className="signup-shell signup-shell-centered">{error && <p className="signup-environment-note" role="alert">{error}</p>}{content}</div>
  </div>;
}
