import { ACCOUNT_ROLES } from './signupModel.js';

// 정식 오픈 전 프론트엔드 전용 회원가입 신청 폼의 순수 로직입니다.
// 이 모듈은 어떤 브라우저 저장소(localStorage/sessionStorage/쿠키)도 사용하지 않습니다.
// 값은 폼이 열려 있는 동안 React 컴포넌트 상태로만 존재하며, 완료·초기화 시 즉시 비웁니다.
// 서버 계정 생성과 본인인증은 정식 오픈 시 별도로 연결되며, 이 draft는 서버로 전송되지 않습니다.

// 모든 회원이 공통으로 입력하는 최소 항목입니다.
const COMMON_FIELDS = ['name', 'phone', 'email', 'password', 'passwordConfirm'];
// 병원 회원만 추가로 입력하는 항목입니다. (기관명 + 담당자 역할/관계)
const HOSPITAL_FIELDS = ['hospitalName', 'hospitalRole'];
// 필수 동의 항목입니다. 마케팅 수신 동의는 포함하지 않습니다.
const CONSENT_KEYS = ['termsAccepted', 'privacyAccepted', 'ageConfirmed'];

function normalizeRole(role) {
  return ACCOUNT_ROLES.includes(role) ? role : '';
}

function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_PATTERN = /^01[016789]\d{7,8}$/;

function validateName(value) {
  const name = String(value ?? '').trim();
  if (!name) return '이름을 입력해주세요.';
  if (name.length < 2) return '이름을 2자 이상 입력해주세요.';
  return '';
}

function validatePhone(value) {
  const digits = digitsOnly(value);
  if (!digits) return '휴대폰 번호를 입력해주세요.';
  if (!MOBILE_PATTERN.test(digits)) return '휴대폰 번호를 정확히 입력해주세요. 예: 010-1234-5678';
  return '';
}

function validateEmail(value) {
  const email = String(value ?? '').trim();
  if (!email) return '이메일을 입력해주세요.';
  if (!EMAIL_PATTERN.test(email)) return '이메일 형식을 확인해주세요.';
  return '';
}

// 비밀번호 규칙: 8자 이상, 영문과 숫자를 모두 포함합니다.
function validatePassword(value) {
  const password = String(value ?? '');
  if (!password) return '비밀번호를 입력해주세요.';
  if (password.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return '영문과 숫자를 모두 포함해주세요.';
  return '';
}

function validatePasswordConfirm(password, confirm) {
  if (!String(confirm ?? '')) return '비밀번호를 한 번 더 입력해주세요.';
  if (String(password ?? '') !== String(confirm ?? '')) return '비밀번호가 일치하지 않습니다.';
  return '';
}

function validateHospitalName(value) {
  const name = String(value ?? '').trim();
  if (!name) return '병원·기관명을 입력해주세요.';
  if (name.length < 2) return '병원·기관명을 2자 이상 입력해주세요.';
  return '';
}

function validateHospitalRole(value) {
  const role = String(value ?? '').trim();
  if (!role) return '담당자 역할을 입력해주세요. 예: 채용 담당자';
  return '';
}

// 입력에 필요한 필드 순서를 회원 유형에 맞게 반환합니다.
// 병원은 공통 항목 뒤에 기관명·담당자 역할 조건부 필드를 추가합니다.
export function fieldsForRole(memberType) {
  return normalizeRole(memberType) === 'hospital' ? [...COMMON_FIELDS, ...HOSPITAL_FIELDS] : [...COMMON_FIELDS];
}

// 한국 휴대폰 번호를 표시/입력용으로만 하이픈 포맷팅합니다. 저장하지 않습니다.
export function formatKoreanPhone(value) {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

// 개별 필드 검증기입니다. 통과하면 빈 문자열을 반환합니다.
export function validateField(field, draft = {}) {
  switch (field) {
    case 'name': return validateName(draft.name);
    case 'phone': return validatePhone(draft.phone);
    case 'email': return validateEmail(draft.email);
    case 'password': return validatePassword(draft.password);
    case 'passwordConfirm': return validatePasswordConfirm(draft.password, draft.passwordConfirm);
    case 'hospitalName': return validateHospitalName(draft.hospitalName);
    case 'hospitalRole': return validateHospitalRole(draft.hospitalRole);
    default: return '';
  }
}

// 모든 필수 동의가 체크되었는지 확인합니다.
export function allConsentsAccepted(draft = {}) {
  return CONSENT_KEYS.every((key) => draft[key] === true);
}

// '전체 동의' 토글용: 모든 필수 동의를 한 번에 설정합니다.
export function setAllConsents(draft = {}, value) {
  const next = { ...draft };
  for (const key of CONSENT_KEYS) next[key] = value === true;
  return next;
}

// 폼 전체를 검증합니다. 회원 유형에 따라 병원 조건부 필드를 포함하고, 필수 동의 3종을 확인합니다.
export function validateApplicationDraft(draft = {}, memberType = draft.role) {
  const errors = {};
  for (const field of fieldsForRole(memberType)) {
    const message = validateField(field, draft);
    if (message) errors[field] = message;
  }
  if (draft.termsAccepted !== true) errors.termsAccepted = '서비스 이용약관에 동의해주세요.';
  if (draft.privacyAccepted !== true) errors.privacyAccepted = '개인정보 수집·이용에 동의해주세요.';
  if (draft.ageConfirmed !== true) errors.ageConfirmed = '만 14세 이상 확인이 필요합니다.';
  return { valid: Object.keys(errors).length === 0, errors };
}

// 빈 신청서 상태를 생성합니다. 회원 유형만 유지하고 나머지는 모두 비어 있습니다.
export function createEmptyDraft(memberType = '') {
  return {
    role: normalizeRole(memberType),
    name: '',
    phone: '',
    email: '',
    password: '',
    passwordConfirm: '',
    hospitalName: '',
    hospitalRole: '',
    termsAccepted: false,
    privacyAccepted: false,
    ageConfirmed: false
  };
}

// 완료·초기화 시 회원 유형만 남기고 이름·연락처·이메일·비밀번호 등 모든 PII와
// 필수 동의를 즉시 비운 깨끗한 draft를 반환합니다. 모든 동의는 false 로 재설정됩니다.
export function clearDraftFields(draft = {}) {
  return createEmptyDraft(normalizeRole(draft.role));
}
