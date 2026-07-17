import { ACCOUNT_ROLES } from './signupModel.js';

// 정식 오픈 전에 사용하는 프론트엔드 전용 회원가입 신청서입니다.
// 입력값은 브라우저 저장소에 남기지 않으며, 실제 계정 생성은 인증 서버가 열린 뒤 연결합니다.
const COMMON_FIELDS = ['name', 'phone', 'email', 'password', 'passwordConfirm'];
const HOSPITAL_ACCOUNT_FIELDS = ['hospitalRole', 'department'];
const HOSPITAL_INFO_FIELDS = [
  'hospitalName',
  'representativeName',
  'institutionType',
  'institutionPhone',
  'postalCode',
  'address',
  'addressDetail',
  'website',
  'businessNumber',
  'fax'
];
const OPTIONAL_FIELDS = new Set(['department', 'addressDetail', 'website', 'businessNumber', 'fax']);
const CONSENT_KEYS = ['termsAccepted', 'privacyAccepted', 'ageConfirmed'];

function normalizeRole(role) {
  return ACCOUNT_ROLES.includes(role) ? role : '';
}

function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_PATTERN = /^01[016789]\d{7,8}$/;
const PHONE_PATTERN = /^(0(?:2|3[1-3]|4[1-4]|5[1-5]|6[1-4]|70))\d{7,8}$/;
const URL_PATTERN = /^https?:\/\/.+/i;

function requiredText(value, label, minimum = 2) {
  const text = String(value ?? '').trim();
  if (!text) return `${label}을(를) 입력해주세요.`;
  if (text.length < minimum) return `${label}을(를) ${minimum}자 이상 입력해주세요.`;
  return '';
}

function validateName(value) {
  return requiredText(value, '이름');
}

function validatePhone(value) {
  const digits = digitsOnly(value);
  if (!digits) return '휴대폰 번호를 입력해주세요.';
  if (!MOBILE_PATTERN.test(digits)) return '휴대폰 번호를 정확히 입력해주세요. 예: 010-1234-5678';
  return '';
}

function validateInstitutionPhone(value) {
  const digits = digitsOnly(value);
  if (!digits) return '병원 대표 전화번호를 입력해주세요.';
  if (!PHONE_PATTERN.test(digits) && !MOBILE_PATTERN.test(digits)) return '전화번호를 지역번호와 함께 정확히 입력해주세요.';
  return '';
}

function validateEmail(value) {
  const email = String(value ?? '').trim();
  if (!email) return '로그인에 사용할 이메일을 입력해주세요.';
  if (!EMAIL_PATTERN.test(email)) return '이메일 형식을 확인해주세요.';
  return '';
}

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

function validateSelect(value, label) {
  return String(value ?? '').trim() ? '' : `${label}을(를) 선택해주세요.`;
}

export function hospitalAccountFields() {
  return [...COMMON_FIELDS.slice(0, 1), ...HOSPITAL_ACCOUNT_FIELDS, ...COMMON_FIELDS.slice(1)];
}

export function hospitalInfoFields() {
  return [...HOSPITAL_INFO_FIELDS];
}

export function fieldsForRole(memberType) {
  return normalizeRole(memberType) === 'hospital'
    ? [...hospitalAccountFields(), ...hospitalInfoFields()]
    : [...COMMON_FIELDS];
}

export function formatKoreanPhone(value) {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.startsWith('02')) {
    if (digits.length < 6) return digits;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function validateField(field, draft = {}) {
  if (OPTIONAL_FIELDS.has(field) && !String(draft[field] ?? '').trim()) return '';
  switch (field) {
    case 'name': return validateName(draft.name);
    case 'phone': return validatePhone(draft.phone);
    case 'email': return validateEmail(draft.email);
    case 'password': return validatePassword(draft.password);
    case 'passwordConfirm': return validatePasswordConfirm(draft.password, draft.passwordConfirm);
    case 'hospitalRole': return requiredText(draft.hospitalRole, '담당자 직책');
    case 'hospitalName': return requiredText(draft.hospitalName, '병원·기관명');
    case 'representativeName': return requiredText(draft.representativeName, '대표자명');
    case 'institutionType': return validateSelect(draft.institutionType, '기관 유형');
    case 'institutionPhone': return validateInstitutionPhone(draft.institutionPhone);
    case 'postalCode': return requiredText(draft.postalCode, '우편번호', 5);
    case 'address': return requiredText(draft.address, '병원 주소', 5);
    case 'website': return URL_PATTERN.test(String(draft.website ?? '').trim()) ? '' : '홈페이지 주소는 http:// 또는 https://로 시작해주세요.';
    default: return '';
  }
}

export function allConsentsAccepted(draft = {}) {
  return CONSENT_KEYS.every((key) => draft[key] === true);
}

export function setAllConsents(draft = {}, value) {
  const next = { ...draft };
  for (const key of CONSENT_KEYS) next[key] = value === true;
  return next;
}

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

export function createEmptyDraft(memberType = '') {
  return {
    role: normalizeRole(memberType),
    name: '',
    phone: '',
    email: '',
    password: '',
    passwordConfirm: '',
    hospitalRole: '',
    department: '',
    hospitalName: '',
    representativeName: '',
    institutionType: '',
    institutionPhone: '',
    postalCode: '',
    address: '',
    addressDetail: '',
    website: '',
    businessNumber: '',
    fax: '',
    termsAccepted: false,
    privacyAccepted: false,
    ageConfirmed: false
  };
}

export function clearDraftFields(draft = {}) {
  return createEmptyDraft(normalizeRole(draft.role));
}
