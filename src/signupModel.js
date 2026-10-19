export const ACCOUNT_ROLES = Object.freeze(['doctor', 'hospital']);
export const DOCTOR_PROFESSIONS = Object.freeze(['의사', '치과의사', '한의사']);
export const OTHER_MEDICAL_PROFESSIONS = Object.freeze(['간호사', '간호조무사', '방사선사', '임상병리사', '물리치료사', '작업치료사', '치과위생사', '병원 행정·원무', '기타 의료인']);
export const SIGNUP_PROFESSIONS = Object.freeze([...DOCTOR_PROFESSIONS, ...OTHER_MEDICAL_PROFESSIONS]);
export const TERMS_VERSION = 'terms-v1.0-2026-07-18';
export const PRIVACY_NOTICE_VERSION = 'privacy-v1.1-2026-09-12';

export function validateSignup(input = {}) {
  const errors = {};
  if (!ACCOUNT_ROLES.includes(input.role)) errors.role = '회원 유형을 선택해주세요.';
  if (input.termsAccepted !== true) errors.termsAccepted = '서비스 이용약관 동의가 필요합니다.';
  if (input.ageConfirmed !== true) errors.ageConfirmed = '만 14세 이상 확인이 필요합니다.';
  if (input.privacyAcknowledged !== true) errors.privacyAcknowledged = '개인정보 처리 안내를 확인해주세요.';
  return { valid: Object.keys(errors).length === 0, errors };
}

export function accountRoleLabel(role) {
  if (role === 'doctor') return '의료인 회원';
  if (role === 'hospital') return '병원·의료기관';
  return '회원';
}
