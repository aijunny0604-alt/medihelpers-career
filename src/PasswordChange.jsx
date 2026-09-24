import { clearSessionToken } from './authTransport.js';
import React, { useState } from 'react';
import { withBase } from './basePath.js';
export default function PasswordChange() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.password !== values.confirm) { setError('새 비밀번호가 서로 일치하지 않습니다.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(withBase('/api/auth/change-password'), { method:'POST', credentials:'same-origin', headers:{'content-type':'application/json'}, body:JSON.stringify({ currentPassword:values.currentPassword, password:values.password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '비밀번호를 변경하지 못했습니다.');
      clearSessionToken();
      window.location.replace(withBase('/login?passwordChanged=1'));
    } catch (failure) { setError(failure.message); setBusy(false); }
  }
  return <section className="member-panel"><h3>비밀번호 변경</h3><p>변경 후 모든 기기에서 로그아웃됩니다. 새 비밀번호로 다시 로그인해주세요.</p><form className="password-change-form" onSubmit={submit}><label>현재 비밀번호<input type="password" name="currentPassword" autoComplete="current-password" required /></label><label>새 비밀번호<input type="password" name="password" autoComplete="new-password" minLength={8} maxLength={128} required placeholder="영문과 숫자를 포함한 8자 이상" /></label><label>새 비밀번호 확인<input type="password" name="confirm" autoComplete="new-password" minLength={8} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button primary" disabled={busy}>{busy ? '변경 중…' : '비밀번호 변경'}</button></form></section>;
}
