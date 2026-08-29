// App의 공용 인증 상태를 그대로 사용한다. 각 폼이 /api/account를 다시 요청하면
// 첫 화면의 빈 값과 두 번째 응답 값 사이에서 입력칸·버튼이 다시 그려져 깜빡였다.
export function useAccountProfile(auth) {
  const profile = auth?.profile || {};
  const registrationProfile = auth?.registrationProfile || {};
  const hospitalProfile = auth?.hospitalProfile || {};
  return {
    loaded: auth?.status !== 'loading',
    name: profile.name || auth?.identity?.displayName || '',
    phone: profile.phone || '',
    email: auth?.email || auth?.identity?.email || '',
    organization: profile.organization || '',
    jobTitle: profile.jobTitle || '',
    professionType: registrationProfile.professionType || profile.jobTitle || '',
    specialty: registrationProfile.specialty || (auth?.role === 'doctor' ? profile.organization : '') || '',
    region: registrationProfile.region || '',
    birthYear: registrationProfile.birthYear || '',
    gender: registrationProfile.gender || '',
    hospitalRole: registrationProfile.hospitalRole || profile.jobTitle || '',
    department: registrationProfile.department || '',
    website: registrationProfile.website || '',
    fax: registrationProfile.fax || '',
    // 병원 회원가입 때 관리자 승인을 위해 제출한 기관 정보입니다. 원본 증빙 파일은
    // 포함하지 않고 로그인한 본인의 공고 등록 폼 자동입력에 필요한 값만 사용합니다.
    hospitalName: hospitalProfile.hospitalName || profile.organization || '',
    representativeName: hospitalProfile.representativeName || '',
    businessNumber: hospitalProfile.businessNumber || '',
    address: hospitalProfile.address || '',
    verificationStatus: hospitalProfile.verificationStatus || '',
    role: auth?.role || '',
  };
}
