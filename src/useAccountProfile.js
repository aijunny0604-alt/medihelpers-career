// App의 공용 인증 상태를 그대로 사용한다. 각 폼이 /api/account를 다시 요청하면
// 첫 화면의 빈 값과 두 번째 응답 값 사이에서 입력칸·버튼이 다시 그려져 깜빡였다.
export function useAccountProfile(auth) {
  const profile = auth?.profile || {};
  return {
    loaded: auth?.status !== 'loading',
    name: profile.name || auth?.identity?.displayName || '',
    phone: profile.phone || '',
    email: auth?.email || auth?.identity?.email || '',
    organization: profile.organization || '',
    jobTitle: profile.jobTitle || '',
    role: auth?.role || '',
  };
}
