export const ACCOUNT_ROLES = Object.freeze(['doctor', 'hospital']);
export const TERMS_VERSION = 'terms-v1.0-2026-07-18';
export const PRIVACY_NOTICE_VERSION = 'privacy-v1.0-2026-07-18';

export function validateSignup(input = {}) {
  const errors = {};
  if (!ACCOUNT_ROLES.includes(input.role)) errors.role = '회원 유형을 선택해주세요.';
  if (input.termsAccepted !== true) errors.termsAccepted = '서비스 이용약관 동의가 필요합니다.';
  if (input.ageConfirmed !== true) errors.ageConfirmed = '만 14세 이상 확인이 필요합니다.';
  if (input.privacyAcknowledged !== true) errors.privacyAcknowledged = '개인정보 처리 안내를 확인해주세요.';
  return { valid: Object.keys(errors).length === 0, errors };
}

export function accountRoleLabel(role) {
  if (role === 'doctor') return '일반 회원';
  if (role === 'hospital') return '병원·의료기관';
  return '회원';
}
