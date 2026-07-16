import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Building2, Check, CircleCheck, LoaderCircle,
  LockKeyhole, Mail, RotateCcw, ShieldCheck, Sparkles, Stethoscope, UserRound
} from 'lucide-react';
import { accountRoleLabel, validateSignup } from './signupModel.js';
import { readStoredValue, writeStoredValue } from './browserStorage.js';
import {
  PREP_STEPS,
  PREP_STORAGE_KEY,
  SIGNUP_PROVIDERS,
  advanceStep,
  canAdvance,
  isComplete,
  providerLabel,
  regressStep,
  resetPreparation,
  sanitizePreparationState,
  selectProvider,
  stepIndex,
  toStoredPreparation,
  toggleConsent
} from './signupPreparation.js';
import { withBase } from './basePath.js';

const initialForm = (role = '') => ({
  role,
  termsAccepted: false,
  ageConfirmed: false,
  privacyAcknowledged: false
});

const roleContent = {
  doctor: {
    label: '의료인 회원',
    eyebrow: 'MEDICAL PROFESSIONAL',
    title: '의료인 회원가입',
    description: '채용 탐색과 비공개 이직 상담을 위한 계정입니다.',
    afterTitle: '필요할 때만 의료인 자격 확인',
    afterCopy: '비공개 공고 열람이나 소개 진행 시점에 면허·자격 확인을 별도로 안내합니다.',
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
    description: '채용 의뢰와 동의 기반 인재 소개를 위한 기관 담당자 계정입니다.',
    afterTitle: '필요할 때만 의료기관 확인',
    afterCopy: '공고 등록이나 인재 소개 요청 시점에 기관과 담당자 관계를 별도로 확인합니다.',
    benefits: [
      '채용공고 등록과 노출 관리',
      '동의 기반 인재 소개 요청',
      '채용 진행 상황과 상담 관리'
    ],
    icon: Building2
  }
};

const providerVisual = {
  email: { mark: '@', tone: 'email', icon: Mail },
  kakao: { mark: 'K', tone: 'kakao' },
  naver: { mark: 'N', tone: 'naver' },
  google: { mark: 'G', tone: 'google' }
};

const stepTitles = { benefits: '가입 유형·혜택', provider: '가입 방식', consent: '필수 동의', complete: '준비 완료' };

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

function SignupPreview() {
  return <div className="signup-preview" aria-label="최소 정보 회원가입 구성">
    <div><span>1</span><strong>안전한 계정 인증</strong><small>비밀번호를 새로 받지 않습니다</small></div>
    <div><span>2</span><strong>회원 유형만 선택</strong><small>의료인 또는 병원 담당자</small></div>
    <div><span>3</span><strong>자격 확인은 나중에</strong><small>필요한 기능을 쓸 때만 진행</small></div>
  </div>;
}

function MemberTypeChooser() {
  return <section className="signup-card member-type-card">
    <span className="signup-card-icon"><UserRound /></span>
    <small>CHOOSE YOUR ACCOUNT</small>
    <h2>회원 유형을 선택해주세요</h2>
    <p>가입 목적과 확인 절차가 다르므로 의료인 회원과 병원 회원을 분리해 운영합니다.</p>
    <div className="member-type-grid">
      <a href={withBase('/signup/doctor')}><span><Stethoscope /></span><div><small>의료인 회원</small><strong>이직·채용정보를 찾고 있어요</strong><p>공고 탐색 · 비공개 상담 · 지원 관리</p></div><ArrowRight /></a>
      <a href={withBase('/signup/hospital')}><span><Building2 /></span><div><small>병원 회원</small><strong>의료인을 채용하고 싶어요</strong><p>공고 등록 · 채용 의뢰 · 인재 소개</p></div><ArrowRight /></a>
    </div>
    <div className="signup-security-copy"><ShieldCheck /> 어느 유형이든 가입 단계에서는 전화번호·면허번호·기관 서류를 받지 않습니다.</div>
  </section>;
}

function PrepProgress({ current }) {
  const activeIndex = stepIndex(current);
  return <ol className="prep-progress" aria-label="가입 준비 단계">
    {PREP_STEPS.map((step, index) => {
      const state = index < activeIndex ? 'done' : index === activeIndex ? 'current' : 'todo';
      return <li key={step} className={`prep-step-dot ${state}`} aria-current={index === activeIndex ? 'step' : undefined}>
        <span aria-hidden="true">{index < activeIndex ? <Check /> : index + 1}</span>
        <small>{stepTitles[step]}</small>
      </li>;
    })}
  </ol>;
}

function PrepBenefits({ content }) {
  const RoleIcon = content.icon;
  return <>
    <div className="signup-fixed-role prep-role-badge"><span><RoleIcon /></span><div><small>선택한 회원 유형</small><strong>{content.label}</strong></div><CircleCheck /></div>
    <h2>{content.label}으로 준비할 수 있어요</h2>
    <p>{content.description} 아래 혜택을 확인하고 가입 준비를 이어가세요.</p>
    <ul className="prep-benefit-list">
      {content.benefits.map((benefit) => <li key={benefit}><span aria-hidden="true"><Check /></span>{benefit}</li>)}
    </ul>
    <SignupPreview />
    <div className="signup-gate-note"><LockKeyhole /><span><strong>지금은 개인정보를 수집하지 않습니다.</strong><small>이름·전화번호·이메일 없이 가입 흐름만 미리 확인할 수 있습니다.</small></span></div>
  </>;
}

function PrepProviders({ selectedProvider, onSelect }) {
  return <>
    <h2>가입 방식을 선택해주세요</h2>
    <p>정식 오픈 시 아래 방식으로 계정을 연결합니다. 지금은 비밀번호나 인증 정보를 입력하지 않습니다.</p>
    <div className="prep-provider-grid" role="radiogroup" aria-label="가입 방식 선택">
      {SIGNUP_PROVIDERS.map((provider) => {
        const visual = providerVisual[provider.id] || {};
        const Icon = visual.icon;
        const active = selectedProvider === provider.id;
        return <button
          key={provider.id}
          type="button"
          role="radio"
          aria-checked={active}
          className={`prep-provider ${active ? 'selected' : ''}`}
          onClick={() => onSelect(provider.id)}
        >
          <span className={`prep-provider-mark tone-${visual.tone || 'email'}`} aria-hidden="true">{Icon ? <Icon /> : visual.mark}</span>
          <span className="prep-provider-copy"><strong>{provider.label}로 가입</strong><small>{provider.note}</small></span>
          {active ? <CircleCheck className="prep-provider-check" /> : <span className="prep-provider-soon" aria-hidden="true">준비중</span>}
        </button>;
      })}
    </div>
    <div className="signup-security-copy"><ShieldCheck /> 실제 로그인·비밀번호·본인인증은 법무 검토와 사업자 앱 연동이 끝난 정식 오픈 시 연결됩니다.</div>
  </>;
}

function PrepConsent({ state, errors, onToggle }) {
  return <>
    <h2>필수 동의를 확인해주세요</h2>
    <p>가입 준비를 마치려면 아래 필수 항목에 동의해야 합니다. 마케팅 수신 동의는 받지 않습니다.</p>
    <div className="signup-agreements">
      <label><input type="checkbox" checked={state.termsAccepted} onChange={(event) => onToggle('termsAccepted', event.target.checked)} /><span><b>[필수]</b> 서비스 이용약관에 동의합니다.</span></label>
      <details><summary>이용약관 주요 내용</summary><p>계정은 본인만 사용하며 허위 정보·무단 정보 수집·연락처 거래를 금지합니다. 의료인과 병원의 인증 권한은 운영 확인 후 별도로 부여됩니다. 정식 공개 전 사업자 정보와 전체 약관을 확정합니다.</p></details>
      <label><input type="checkbox" checked={state.ageConfirmed} onChange={(event) => onToggle('ageConfirmed', event.target.checked)} /><span><b>[필수]</b> 만 14세 이상입니다.</span></label>
      <label><input type="checkbox" checked={state.privacyAcknowledged} onChange={(event) => onToggle('privacyAcknowledged', event.target.checked)} /><span><b>[필수 확인]</b> 개인정보 처리 안내를 확인했습니다.</span></label>
      <details><summary>개인정보 처리 안내</summary><p>정식 오픈 시 계정 생성과 보안을 위해 인증 사업자 식별정보, 인증된 이메일, 회원 유형, 가입·동의 기록을 처리합니다. 준비 흐름에서는 어떤 개인정보도 저장하지 않으며, 회원 유형과 동의 확인 상태만 이 브라우저에 남습니다.</p></details>
      {errors && <em role="alert">필수 약관과 안내를 모두 확인해주세요.</em>}
    </div>
    <div className="signup-no-marketing"><CircleCheck /><span><strong>광고 수신 동의는 받지 않습니다</strong><small>마케팅 알림은 정식 가입 후 원할 때만 별도로 선택할 수 있습니다.</small></span></div>
  </>;
}

function PrepComplete({ content, state, onReset }) {
  return <div className="prep-complete">
    <span className="account-check"><CircleCheck /></span>
    <small>READY TO JOIN</small>
    <h2>가입 준비 프로필이 완료되었습니다</h2>
    <p>정식 오픈 시 아래 선택으로 바로 가입을 이어갈 수 있도록 준비되었습니다. 실제 계정 활성화는 법무 검토 완료 후 진행됩니다.</p>
    <dl>
      <div><dt>회원 유형</dt><dd>{content.label}</dd></div>
      <div><dt>선택한 가입 방식</dt><dd>{providerLabel(state.selectedProvider) || '미선택'} <span className="prep-soon-tag">정식 오픈 시 연결</span></dd></div>
      <div><dt>필수 동의</dt><dd>이용약관 · 만 14세 · 개인정보 안내 확인</dd></div>
      <div><dt>수집한 개인정보</dt><dd>없음</dd></div>
    </dl>
    <div className="signup-gate-note"><LockKeyhole /><span><strong>지금은 개인정보를 저장하지 않습니다.</strong><small>이 브라우저에는 회원 유형·선택한 방식·동의 확인 상태만 남습니다.</small></span></div>
    <div className="account-actions">
      <a className="button primary" href="mailto:hr@medihelpers.co.kr">오픈 알림 신청 <ArrowRight /></a>
      <a className="button outline" href={withBase(content.role === 'doctor' ? '/jobs' : '/talent')}>먼저 둘러보기 <ArrowRight /></a>
    </div>
    <button type="button" className="account-delete" onClick={onReset}><RotateCcw size={13} /> 준비 내용 초기화</button>
  </div>;
}

function PreparationFlow({ memberType }) {
  const content = { ...roleContent[memberType], role: memberType };
  const [state, setState] = useState(() => {
    const stored = readStoredValue(PREP_STORAGE_KEY, null);
    return sanitizePreparationState(stored, memberType);
  });
  const [showConsentError, setShowConsentError] = useState(false);

  // 비민감 상태만 저장하고 새로고침 시 이어하기를 지원합니다. PII는 toStoredPreparation이 구조적으로 제거합니다.
  useEffect(() => {
    writeStoredValue(PREP_STORAGE_KEY, toStoredPreparation(state));
  }, [state]);

  const goNext = () => {
    if (state.step === 'consent' && !canAdvance(state)) {
      setShowConsentError(true);
      return;
    }
    setShowConsentError(false);
    setState((current) => advanceStep(current));
  };
  const goBack = () => {
    setShowConsentError(false);
    setState((current) => regressStep(current));
  };
  const reset = () => {
    setShowConsentError(false);
    setState(resetPreparation(memberType));
  };

  const total = PREP_STEPS.length;
  const position = stepIndex(state.step) + 1;
  const completed = isComplete(state);

  let body;
  if (state.step === 'benefits') body = <PrepBenefits content={content} />;
  else if (state.step === 'provider') body = <PrepProviders selectedProvider={state.selectedProvider} onSelect={(id) => setState((current) => selectProvider(current, id))} />;
  else if (state.step === 'consent') body = <PrepConsent state={state} errors={showConsentError} onToggle={(field, value) => setState((current) => toggleConsent(current, field, value))} />;
  else body = <PrepComplete content={content} state={state} onReset={reset} />;

  return <section className="signup-card signup-prep">
    <div className="prep-header">
      <span className="prep-launch-tag"><Sparkles size={13} /> {content.eyebrow} · 가입 준비 미리보기</span>
      <PrepProgress current={state.step} />
    </div>
    <p className="prep-live-status" role="status" aria-live="polite">단계 {position}/{total} · {stepTitles[state.step]}</p>
    {body}
    {!completed && <div className="prep-actions">
      {state.step !== 'benefits' ? <button type="button" className="button outline" onClick={goBack}><ArrowLeft size={16} /> 이전</button> : <a className="button outline" href={withBase(memberType === 'doctor' ? '/signup/hospital' : '/signup/doctor')}>{memberType === 'doctor' ? '병원 회원' : '의료인 회원'}으로 보기</a>}
      {/* consent 미완료 시에도 버튼을 비활성화하지 않는다: 눌러야 goNext가 필수 동의 안내(role=alert)를 노출한다. aria-disabled도 쓰지 않고 실제로 클릭 가능하게 유지한다. */}
      <button type="button" className="button primary" onClick={goNext}>{state.step === 'consent' ? '가입 준비 완료' : '다음'} <ArrowRight size={16} /></button>
    </div>}
    {!completed && <button type="button" className="prep-reset-link" onClick={reset}><RotateCcw size={13} /> 처음부터 다시</button>}
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
    <div className="signup-security-copy"><ShieldCheck /> 인증 후에도 이름·전화번호·면허번호를 가입 단계에서 요구하지 않습니다.</div>
    <a className="signup-switch-type" href={withBase(memberType === 'doctor' ? '/signup/hospital' : '/signup/doctor')}>대신 {memberType === 'doctor' ? '병원 회원' : '의료인 회원'}으로 가입</a>
  </section>;
}

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
        <label><input type="checkbox" checked={form.termsAccepted} onChange={(event) => update('termsAccepted', event.target.checked)} /><span><b>[필수]</b> 서비스 이용약관에 동의합니다.</span></label>
        <details><summary>이용약관 주요 내용</summary><p>계정은 본인만 사용하며 허위 정보·무단 정보 수집·연락처 거래를 금지합니다. 의료인과 병원의 인증 권한은 운영 확인 후 별도로 부여됩니다. 정식 공개 전 사업자 정보와 전체 약관을 확정합니다.</p></details>
        <label><input type="checkbox" checked={form.ageConfirmed} onChange={(event) => update('ageConfirmed', event.target.checked)} /><span><b>[필수]</b> 만 14세 이상입니다.</span></label>
        <label><input type="checkbox" checked={form.privacyAcknowledged} onChange={(event) => update('privacyAcknowledged', event.target.checked)} /><span><b>[필수 확인]</b> 개인정보 처리 안내를 확인했습니다.</span></label>
        <details><summary>개인정보 처리 안내</summary><p>계정 생성과 보안을 위해 인증 사업자 식별정보, 인증된 이메일, 회원 유형, 가입·동의 기록을 처리합니다. 서비스에는 이메일 원문 대신 서버 비밀키를 사용한 HMAC-SHA-256 값을 계정 키로 저장하며, 회원 탈퇴 시 관계 법령상 보존 의무가 없는 정보는 삭제합니다.</p></details>
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
    <div className="account-actions"><a className="button primary" href={withBase(account.role === 'doctor' ? '/jobs' : '/talent')}>서비스 시작 <ArrowRight /></a><a className="button outline" href={withBase(`/signout-with-chatgpt?return_to=${withBase('/')}`)}>로그아웃</a></div>
    <button className="account-delete" type="button" onClick={remove} disabled={deleting}>{deleting ? '삭제 중…' : '계정 삭제'}</button>
  </section>;
}

function SignupPrinciples({ memberType }) {
  const content = roleContent[memberType];
  return <aside className="signup-principles">
    <h3>가입할 때 받지 않는 정보</h3>
    <ul><li><Check /> 전화번호</li><li><Check /> 주민등록번호</li><li><Check /> 면허·자격 서류</li><li><Check /> 마케팅 수신 동의</li></ul>
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
  let content;
  if (state.loading) content = <section className="signup-card signup-loading" role="status" aria-live="polite"><LoaderCircle className="spin" aria-hidden="true" /><strong>안전한 가입 상태를 확인하고 있습니다</strong></section>;
  else if (state.account) content = <AccountCard account={state.account} identity={state.identity} onDeleted={() => setState((current) => ({ ...current, account: null }))} />;
  else if (!memberType) content = <MemberTypeChooser />;
  else if (!state.signupEnabled) content = <PreparationFlow memberType={memberType} />;
  else if (!state.signedIn) content = <SignedOutCard memberType={memberType} />;
  else content = <SignupForm identity={state.identity} memberType={memberType} onComplete={(account) => setState((current) => ({ ...current, account }))} />;
  return <div className="signup-page">
    <header className="signup-hero"><span><LockKeyhole /> {roleContent[memberType]?.eyebrow || 'MINIMUM DATA ACCOUNT'}</span><h1>{title}</h1><p>{roleContent[memberType]?.description || '의료인 회원과 병원 회원을 구분해 필요한 기능과 확인 절차만 제공합니다.'}</p></header>
    <div className="signup-shell">{error && <p className="signup-environment-note" role="alert">{error}</p>}{content}<SignupPrinciples memberType={memberType} /></div>
  </div>;
}
