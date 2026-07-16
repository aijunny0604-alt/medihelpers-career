import { ACCOUNT_ROLES, validateSignup } from './signupModel.js';

// 정식 오픈 전 프론트엔드 회원가입 준비 흐름의 순수 로직입니다.
// 개인정보(PII)는 다루지 않으며, 역할·선택한 가입 방식·동의 UI 상태 같은 비민감 값만 취급합니다.
export const PREP_STORAGE_KEY = 'medihelpers_signup_prep';

// 흐름 단계 순서: 혜택 확인 → 가입 방식 선택 → 필수 동의 → 준비 완료
export const PREP_STEPS = Object.freeze(['benefits', 'provider', 'consent', 'complete']);

// 실제 OAuth·비밀번호 입력·가짜 인증 없이 "정식 오픈 시 연결"만 표기하는 가입 방식 목록입니다.
export const SIGNUP_PROVIDERS = Object.freeze([
  { id: 'email', label: '이메일', note: '정식 오픈 시 이메일 인증 연결' },
  { id: 'kakao', label: '카카오', note: '정식 오픈 시 카카오 로그인 연결' },
  { id: 'naver', label: '네이버', note: '정식 오픈 시 네이버 로그인 연결' },
  { id: 'google', label: 'Google', note: '정식 오픈 시 Google 로그인 연결' }
]);

export const PROVIDER_IDS = Object.freeze(SIGNUP_PROVIDERS.map((provider) => provider.id));

// localStorage에 저장·복원할 수 있는 키만 화이트리스트로 고정합니다. 이름·전화·이메일 등 PII는 포함하지 않습니다.
const ALLOWED_KEYS = Object.freeze(['role', 'step', 'selectedProvider', 'termsAccepted', 'ageConfirmed', 'privacyAcknowledged']);

function normalizeRole(role) {
  return ACCOUNT_ROLES.includes(role) ? role : '';
}

export function createPreparationState(role = '') {
  return {
    role: normalizeRole(role),
    step: 'benefits',
    selectedProvider: '',
    termsAccepted: false,
    ageConfirmed: false,
    privacyAcknowledged: false
  };
}

export function stepIndex(step) {
  const index = PREP_STEPS.indexOf(step);
  return index === -1 ? 0 : index;
}

export function providerLabel(providerId) {
  return SIGNUP_PROVIDERS.find((provider) => provider.id === providerId)?.label || '';
}

export function consentComplete(state = {}) {
  return validateSignup({
    role: state.role,
    termsAccepted: state.termsAccepted,
    ageConfirmed: state.ageConfirmed,
    privacyAcknowledged: state.privacyAcknowledged
  }).valid;
}

// 현재 상태로 도달할 수 있는 가장 앞선 단계를 계산합니다. 조작된 저장값이 완료 화면으로 건너뛰는 것을 막습니다.
export function furthestReachableStep(state = {}) {
  if (!normalizeRole(state.role)) return 'benefits';
  // 혜택 확인은 안내 단계이므로 역할만 있으면 가입 방식 선택까지 도달할 수 있습니다.
  let reachable = 'provider';
  if (PROVIDER_IDS.includes(state.selectedProvider)) reachable = 'consent';
  if (reachable === 'consent' && consentComplete(state)) reachable = 'complete';
  return reachable;
}

function clampStep(state) {
  const target = PREP_STEPS.includes(state.step) ? state.step : 'benefits';
  const limit = furthestReachableStep(state);
  const clampedIndex = Math.min(stepIndex(target), stepIndex(limit));
  return { ...state, step: PREP_STEPS[clampedIndex] };
}

// 새로고침 이어하기: 저장값을 신뢰하지 않고 허용 키만 정제하며, 현재 경로의 역할과 다르면 새로 시작합니다.
export function sanitizePreparationState(raw, role) {
  const base = createPreparationState(role);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  // 저장된 역할이 현재 가입 경로(의료인/병원)와 다르면 이전 진행을 이어받지 않습니다.
  if (raw.role && normalizeRole(raw.role) !== base.role) return base;

  const restored = {
    role: base.role,
    step: PREP_STEPS.includes(raw.step) ? raw.step : 'benefits',
    selectedProvider: PROVIDER_IDS.includes(raw.selectedProvider) ? raw.selectedProvider : '',
    termsAccepted: raw.termsAccepted === true,
    ageConfirmed: raw.ageConfirmed === true,
    privacyAcknowledged: raw.privacyAcknowledged === true
  };
  return clampStep(restored);
}

// 저장 직전에도 허용 키만 남겨 우발적인 PII 저장을 구조적으로 차단합니다.
export function toStoredPreparation(state = {}) {
  const clean = createPreparationState(state.role);
  for (const key of ALLOWED_KEYS) {
    if (key in state) clean[key] = state[key];
  }
  return {
    role: clean.role,
    step: PREP_STEPS.includes(clean.step) ? clean.step : 'benefits',
    selectedProvider: PROVIDER_IDS.includes(clean.selectedProvider) ? clean.selectedProvider : '',
    termsAccepted: clean.termsAccepted === true,
    ageConfirmed: clean.ageConfirmed === true,
    privacyAcknowledged: clean.privacyAcknowledged === true
  };
}

export function selectProvider(state, providerId) {
  if (!PROVIDER_IDS.includes(providerId)) return state;
  return { ...state, selectedProvider: providerId };
}

export function toggleConsent(state, field, value) {
  if (!['termsAccepted', 'ageConfirmed', 'privacyAcknowledged'].includes(field)) return state;
  return { ...state, [field]: value === true };
}

// 현재 단계에서 다음으로 넘어갈 수 있는지 여부입니다.
export function canAdvance(state = {}) {
  switch (state.step) {
    case 'benefits':
      return Boolean(normalizeRole(state.role));
    case 'provider':
      return PROVIDER_IDS.includes(state.selectedProvider);
    case 'consent':
      return consentComplete(state);
    default:
      return false;
  }
}

export function advanceStep(state) {
  if (!canAdvance(state)) return state;
  const next = stepIndex(state.step) + 1;
  if (next >= PREP_STEPS.length) return state;
  return { ...state, step: PREP_STEPS[next] };
}

export function regressStep(state) {
  const previous = stepIndex(state.step) - 1;
  if (previous < 0) return state;
  return { ...state, step: PREP_STEPS[previous] };
}

export function isComplete(state = {}) {
  return state.step === 'complete' && consentComplete(state) && PROVIDER_IDS.includes(state.selectedProvider);
}

export function resetPreparation(role) {
  return createPreparationState(role);
}
