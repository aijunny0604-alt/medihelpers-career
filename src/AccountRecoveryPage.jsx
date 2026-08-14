import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, KeyRound, LockKeyhole, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { withBase } from './basePath.js';

const genericMessage = {
  id: '입력한 정보와 일치하는 계정이 있으면 가입 이메일로 아이디 안내를 보냈습니다.',
  password: '입력한 이메일과 일치하는 계정이 있으면 비밀번호 재설정 링크를 보냈습니다.',
};

export default function AccountRecoveryPage() {
  const link = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      token: params.get('token') || '',
      isReset: params.get('mode') === 'password' && Boolean(params.get('token')),
      initialMode: params.get('mode') === 'password' ? 'password' : 'id',
    };
  }, []);
  const [mode, setMode] = useState(link.initialMode);
  const [requestResult, setRequestResult] = useState(null);
  const [resetComplete, setResetComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setRequestResult(null);
    setError('');
  };

  const requestRecovery = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(withBase('/api/account-recovery'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestType: mode,
          name: form.get('name') || '',
          phone: form.get('phone') || '',
          email: form.get('email') || '',
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.accepted) throw new Error(result.error || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.');
      setRequestResult({ emailDeliveryAvailable: result.emailDeliveryAvailable !== false });
    } catch (submitError) {
      setError(submitError.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    const passwordConfirm = String(form.get('passwordConfirm') || '');
    if (password !== passwordConfirm) {
      setError('새 비밀번호가 서로 일치하지 않습니다.');
      setSubmitting(false);
      return;
    }
    try {
      const response = await fetch(withBase('/api/account-recovery'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', token: link.token, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.reset) throw new Error(result.error || '비밀번호를 변경하지 못했습니다.');
      window.history.replaceState({}, '', withBase('/account/recovery?mode=password'));
      setResetComplete(true);
    } catch (submitError) {
      setError(submitError.message || '비밀번호를 변경하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const done = resetComplete || requestResult;
  const doneTitle = resetComplete ? '비밀번호가 변경되었습니다' : '이메일 안내를 요청했습니다';
  const doneText = resetComplete
    ? '기존 로그인은 안전을 위해 모두 종료되었습니다. 새 비밀번호로 다시 로그인해주세요.'
    : requestResult?.emailDeliveryAvailable
      ? genericMessage[mode]
      : '현재 이메일 발송 설정이 준비되지 않아 요청만 안전하게 접수되었습니다. 빠른 확인이 필요하면 고객센터로 문의해주세요.';

  return <div className="recovery-page">
    <header>
      <small>ACCOUNT HELP</small>
      <h1>{link.isReset ? '새 비밀번호를 설정하세요' : <>로그인 정보를<br />이메일로 확인하세요</>}</h1>
      <p>{link.isReset ? '보안을 위해 영문과 숫자를 포함한 8자 이상의 새 비밀번호를 사용해주세요.' : '가입할 때 등록한 이메일로 아이디 안내와 비밀번호 재설정 링크를 보내드립니다.'}</p>
    </header>
    <div className="recovery-shell">
      <section className="recovery-card">
        {!link.isReset && !resetComplete && <div className="recovery-tabs">
          <button type="button" className={mode === 'id' ? 'active' : ''} onClick={() => switchMode('id')}><Mail /> 아이디 찾기</button>
          <button type="button" className={mode === 'password' ? 'active' : ''} onClick={() => switchMode('password')}><KeyRound /> 비밀번호 재설정</button>
        </div>}
        {done ? <div className="recovery-done">
          <span><Check /></span>
          <h2>{doneTitle}</h2>
          <p>{doneText}</p>
          {resetComplete
            ? <a className="button primary" href={withBase('/login')}>로그인하기 <ArrowRight /></a>
            : <button className="button primary" type="button" onClick={() => setRequestResult(null)}>다시 요청하기</button>}
        </div> : link.isReset ? <form onSubmit={resetPassword}>
          <span className="recovery-icon"><LockKeyhole /></span>
          <h2>새 비밀번호 입력</h2>
          <p>이메일로 받은 일회용 링크를 확인했습니다. 계정에 사용할 새 비밀번호를 설정합니다.</p>
          <label><span>새 비밀번호</span><input required minLength="8" name="password" type="password" autoComplete="new-password" placeholder="영문·숫자 포함 8자 이상" /></label>
          <label><span>새 비밀번호 확인</span><input required minLength="8" name="passwordConfirm" type="password" autoComplete="new-password" placeholder="새 비밀번호를 한 번 더 입력" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary full" type="submit" disabled={submitting}>{submitting ? '변경 중' : '비밀번호 변경'} {!submitting && <ArrowRight />}</button>
        </form> : <form onSubmit={requestRecovery}>
          <span className="recovery-icon">{mode === 'id' ? <Mail /> : <LockKeyhole />}</span>
          <h2>{mode === 'id' ? '가입 이메일로 아이디 받기' : '비밀번호 재설정 링크 받기'}</h2>
          <p>{mode === 'id' ? '회원가입 때 입력한 이름과 휴대전화 번호를 확인한 뒤 가입 이메일로 안내합니다.' : '회원가입 때 등록한 이메일을 입력하면 30분 동안 한 번 사용할 수 있는 링크를 보내드립니다.'}</p>
          {mode === 'id' ? <>
            <label><span>이름 또는 담당자명</span><input required name="name" autoComplete="name" placeholder="회원가입 때 입력한 이름" /></label>
            <label><span>휴대전화</span><input required name="phone" type="tel" autoComplete="tel" placeholder="010-0000-0000" /></label>
          </> : <label><span>가입 이메일</span><input required name="email" type="email" autoComplete="email" placeholder="example@email.com" /></label>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary full" type="submit" disabled={submitting}>{submitting ? '요청 중' : '이메일로 안내받기'} {!submitting && <ArrowRight />}</button>
        </form>}
      </section>
      <aside className="recovery-help">
        <ShieldCheck />
        <h3>계정 보안 안내</h3>
        <ul>
          <li>계정 존재 여부는 화면에 노출하지 않고 가입 이메일로만 안내합니다.</li>
          <li>비밀번호 재설정 링크는 30분 동안 한 번만 사용할 수 있습니다.</li>
          <li>비밀번호를 바꾸면 기존 로그인 세션은 모두 안전하게 종료됩니다.</li>
          <li>의료인 회원과 병원 회원 모두 같은 방식으로 이용합니다.</li>
        </ul>
        <a href="tel:0513425463"><MessageCircle /> 051-342-5463</a>
        <a href="mailto:hr@medihelpers.co.kr">hr@medihelpers.co.kr</a>
        <a className="recovery-login" href={withBase('/login')}>로그인 화면으로 돌아가기</a>
      </aside>
    </div>
  </div>;
}
