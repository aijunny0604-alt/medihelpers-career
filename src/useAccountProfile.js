import { useEffect, useState } from 'react';

// 로그인 회원의 프로필(이름·연락처·이메일·소속)을 불러와 폼 자동 채움에 사용하는 공용 훅.
// 비로그인/서버 미가용 시 빈 값을 반환하므로 폼은 그대로 수동 입력할 수 있다.
export function useAccountProfile() {
  const [profile, setProfile] = useState({ loaded: false, name: '', phone: '', email: '', organization: '', jobTitle: '', role: '' });
  useEffect(() => {
    let active = true;
    fetch('/api/account', { credentials: 'same-origin', headers: { accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('account lookup failed'))))
      .then((result) => {
        if (!active) return;
        const p = result.profile || {};
        setProfile({
          loaded: true,
          name: p.name || result.identity?.displayName || '',
          phone: p.phone || '',
          email: result.email || result.identity?.email || '',
          organization: p.organization || '',
          jobTitle: p.jobTitle || '',
          role: result.account?.role || '',
        });
      })
      .catch(() => active && setProfile((current) => ({ ...current, loaded: true })));
    return () => { active = false; };
  }, []);
  return profile;
}
