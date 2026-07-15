import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BadgeCheck, Building2, Check, CircleCheck, LoaderCircle,
  LockKeyhole, ShieldCheck, Stethoscope, UserRound
} from 'lucide-react';
import { accountRoleLabel, validateSignup } from './signupModel.js';

const initialForm = {
  role: '',
  termsAccepted: false,
  ageConfirmed: false,
  privacyAcknowledged: false
};

async function accountRequest(method = 'GET', body) {
  const response = await fetch('/api/account', {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error('회원 시스템을 사용할 수 없는 배포 환경입니다.');
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

function PreparationGate() {
  return <section className="signup-card signup-gate">
    <span className="signup-card-icon"><ShieldCheck /></span>
    <small>SAFE LAUNCH GATE</small>
    <h2>회원가입 시스템을 안전하게 준비하고 있습니다</h2>
    <p>가입 기능은 구현되어 있지만, 사업자 정보·개인정보 처리방침·보유기간과 외부 인증 사업자 검토가 끝난 뒤에만 공개됩니다.</p>
    <SignupPreview />
    <div className="signup-gate-note"><LockKeyhole /><span><strong>현재 개인정보는 수집하지 않습니다.</strong><small>가입을 기다리지 않고 상담이 필요하면 바로 연락해주세요.</small></span></div>
    <a className="button primary full" href="mailto:hr@medihelpers.co.kr">오픈 알림 문의 <ArrowRight /></a>
  </section>;
}

function SignedOutCard() {
  return <section className="signup-card">
    <span className="signup-card-icon"><UserRound /></span>
    <small>ONE SAFE ACCOUNT</small>
    <h2>계정 인증부터 시작해주세요</h2>
    <p>메디헬퍼스가 비밀번호를 별도로 수집하지 않도록 현재 플랫폼의 안전한 계정 인증을 사용합니다.</p>
    <a className="button primary full signup-provider" href="/signin-with-chatgpt?return_to=/signup">
      안전한 계정으로 계속 <ArrowRight />
    </a>
    <div className="signup-security-copy"><ShieldCheck /> 인증 후에도 이름·전화번호·면허번호를 가입 단계에서 요구하지 않습니다.</div>
  </section>;
}

function SignupForm({ identity, onComplete }) {
  const [form, setForm] = useState(initialForm);
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
    <h2>어떤 목적으로 이용하시나요?</h2>
    <p>회원 유형 하나만 선택하면 가입이 끝납니다. 자격 확인과 서류 제출은 해당 기능을 사용할 때 별도로 진행합니다.</p>
    <form onSubmit={submit} noValidate>
      <fieldset className="signup-role-fieldset">
        <legend>회원 유형</legend>
        <label className={form.role === 'doctor' ? 'selected' : ''}>
          <input type="radio" name="role" value="doctor" checked={form.role === 'doctor'} onChange={() => update('role', 'doctor')} />
          <span><Stethoscope /></span><div><strong>의료인</strong><small>채용 탐색과 비공개 이직 상담</small></div><Check />
        </label>
        <label className={form.role === 'hospital' ? 'selected' : ''}>
          <input type="radio" name="role" value="hospital" checked={form.role === 'hospital'} onChange={() => update('role', 'hospital')} />
          <span><Building2 /></span><div><strong>병원·의료기관</strong><small>채용 의뢰와 인재 소개 요청</small></div><Check />
        </label>
        {errors.role && <em>{errors.role}</em>}
      </fieldset>
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
    <div className="account-actions"><a className="button primary" href={account.role === 'doctor' ? '/jobs' : '/talent'}>서비스 시작 <ArrowRight /></a><a className="button outline" href="/signout-with-chatgpt?return_to=/">로그아웃</a></div>
    <button className="account-delete" type="button" onClick={remove} disabled={deleting}>{deleting ? '삭제 중…' : '계정 삭제'}</button>
  </section>;
}

export default function AccountPage() {
  const [state, setState] = useState({ loading: true, signupEnabled: false, signedIn: false, account: null, identity: {} });
  const [error, setError] = useState('');
  const title = useMemo(() => state.account ? '내 계정' : '간편 회원가입', [state.account]);
  useEffect(() => {
    accountRequest().then((data) => setState({ loading: false, ...data })).catch((loadError) => {
      setError(loadError.message);
      setState((current) => ({ ...current, loading: false }));
    });
  }, []);
  let content;
  if (state.loading) content = <section className="signup-card signup-loading"><LoaderCircle className="spin" /><strong>안전한 가입 상태를 확인하고 있습니다</strong></section>;
  else if (!state.signupEnabled) content = <PreparationGate />;
  else if (!state.signedIn) content = <SignedOutCard />;
  else if (state.account) content = <AccountCard account={state.account} identity={state.identity} onDeleted={() => setState((current) => ({ ...current, account: null }))} />;
  else content = <SignupForm identity={state.identity} onComplete={(account) => setState((current) => ({ ...current, account }))} />;
  return <div className="signup-page">
    <header className="signup-hero"><span><LockKeyhole /> MINIMUM DATA ACCOUNT</span><h1>{title}</h1><p>비밀번호·전화번호·면허번호 없이, 안전한 계정 인증과 회원 유형만으로 시작합니다.</p></header>
    <div className="signup-shell">{error && <p className="signup-environment-note">{error}</p>}{content}<aside className="signup-principles"><h3>가입할 때 받지 않는 정보</h3><ul><li><Check /> 전화번호</li><li><Check /> 주민등록번호</li><li><Check /> 면허·자격 서류</li><li><Check /> 마케팅 수신 동의</li></ul><p>면허나 기관 확인은 검증 기능을 사용할 때 목적·기간을 다시 안내하고 최소 범위로 진행합니다.</p></aside></div>
  </div>;
}
