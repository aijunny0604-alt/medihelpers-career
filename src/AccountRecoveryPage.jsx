import React, { useState } from 'react';
import { ArrowRight, Check, KeyRound, LockKeyhole, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { withBase } from './basePath.js';

export default function AccountRecoveryPage() {
  const [mode, setMode] = useState('id');
  const [requestId, setRequestId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setRequestId('');
    setError('');
  };

  const submit = async (event) => {
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
      if (!response.ok || !result.accepted || !result.requestId) throw new Error(result.error || '요청을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
      setRequestId(result.requestId);
    } catch (submitError) {
      setError(submitError.message || '요청을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="recovery-page"><header><small>ACCOUNT HELP</small><h1>로그인 정보를<br />안전하게 확인하세요</h1><p>가입 이메일 확인과 비밀번호 재설정에 필요한 본인 확인을 요청합니다.</p></header><div className="recovery-shell"><section className="recovery-card"><div className="recovery-tabs"><button type="button" className={mode === 'id' ? 'active' : ''} onClick={() => switchMode('id')}><Mail /> 아이디 찾기</button><button type="button" className={mode === 'password' ? 'active' : ''} onClick={() => switchMode('password')}><KeyRound /> 비밀번호 재설정</button></div>{requestId ? <div className="recovery-done"><span><Check /></span><h2>확인 요청이 저장되었습니다</h2><p>접수번호 <strong>{requestId}</strong><br />담당자가 가입 정보와 본인 여부를 확인한 뒤 안내드립니다.</p><button className="button primary" type="button" onClick={() => setRequestId('')}>다시 요청하기</button></div> : <form onSubmit={submit}><span className="recovery-icon">{mode === 'id' ? <Mail /> : <LockKeyhole />}</span><h2>{mode === 'id' ? '가입 이메일 확인 요청' : '비밀번호 재설정 요청'}</h2><p>{mode === 'id' ? '가입할 때 입력한 이름과 휴대전화로 본인 확인을 요청합니다.' : '가입한 이메일을 입력하면 담당자가 본인 확인 절차를 안내합니다.'}</p>{mode === 'id' ? <><label><span>이름·담당자명</span><input required name="name" autoComplete="name" placeholder="이름을 입력해주세요" /></label><label><span>휴대전화</span><input required name="phone" type="tel" autoComplete="tel" placeholder="010-0000-0000" /></label></> : <label><span>가입 이메일</span><input required name="email" type="email" autoComplete="email" placeholder="example@email.com" /></label>}{error && <p className="form-error" role="alert">{error}</p>}<button className="button primary full" type="submit" disabled={submitting}>{submitting ? '요청 저장 중' : '본인 확인 요청'} {!submitting && <ArrowRight />}</button></form>}</section><aside className="recovery-help"><ShieldCheck /><h3>계정 보안 안내</h3><ul><li>접수만으로 비밀번호가 바뀌거나 로그인 링크가 자동 발송되지는 않습니다.</li><li>의사·병원 회원 유형이 달라도 같은 로그인 도움을 이용합니다.</li><li>담당자가 가입 정보와 본인 여부를 확인한 뒤 안내드립니다.</li></ul><a href="tel:0513425463"><MessageCircle /> 051-342-5463</a><a href="mailto:hr@medihelpers.co.kr">hr@medihelpers.co.kr</a><a className="recovery-login" href={withBase('/login')}>로그인 화면으로 돌아가기</a></aside></div></div>;
}
