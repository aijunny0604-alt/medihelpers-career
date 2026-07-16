import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PREP_STEPS,
  PROVIDER_IDS,
  advanceStep,
  canAdvance,
  createPreparationState,
  furthestReachableStep,
  isComplete,
  regressStep,
  resetPreparation,
  sanitizePreparationState,
  selectProvider,
  toStoredPreparation,
  toggleConsent
} from './signupPreparation.js';

const consented = (role) => ({
  role,
  step: 'consent',
  selectedProvider: 'email',
  termsAccepted: true,
  ageConfirmed: true,
  privacyAcknowledged: true
});

test('creates a fresh state locked to a known role and the first step', () => {
  assert.deepEqual(createPreparationState('doctor'), {
    role: 'doctor',
    step: 'benefits',
    selectedProvider: '',
    termsAccepted: false,
    ageConfirmed: false,
    privacyAcknowledged: false
  });
  assert.equal(createPreparationState('intruder').role, '');
});

test('advances only when the current step is satisfied', () => {
  let state = createPreparationState('doctor');
  assert.equal(canAdvance(state), true); // benefits is informational
  state = advanceStep(state);
  assert.equal(state.step, 'provider');

  // provider step blocks until a real provider id is chosen
  assert.equal(canAdvance(state), false);
  assert.equal(advanceStep(state).step, 'provider');
  state = selectProvider(state, 'kakao');
  assert.equal(canAdvance(state), true);
  state = advanceStep(state);
  assert.equal(state.step, 'consent');

  // consent step blocks until all three required confirmations are checked
  assert.equal(canAdvance(state), false);
  state = toggleConsent(state, 'termsAccepted', true);
  state = toggleConsent(state, 'ageConfirmed', true);
  assert.equal(canAdvance(state), false);
  state = toggleConsent(state, 'privacyAcknowledged', true);
  assert.equal(canAdvance(state), true);
  state = advanceStep(state);
  assert.equal(state.step, 'complete');
  assert.equal(isComplete(state), true);
});

test('consent step with partial consent blocks advancing so the UI can surface the required-consent alert', () => {
  // 준비 완료 버튼은 이 가드로 동작을 나눈다: canAdvance가 false면 눌러도 다음 단계로 넘어가지 않고
  // 필수 동의 안내(role=alert)를 노출해야 한다. 버튼을 비활성화하는 대신 이 무동작 보장에 기댄다.
  let state = { ...consented('doctor'), termsAccepted: true, ageConfirmed: true, privacyAcknowledged: false };
  assert.equal(canAdvance(state), false);
  assert.equal(advanceStep(state).step, 'consent'); // no-op: goNext는 안내를 띄우고 단계를 유지한다

  state = toggleConsent(state, 'privacyAcknowledged', true);
  assert.equal(canAdvance(state), true);
  assert.equal(advanceStep(state).step, 'complete');
});

test('ignores unknown providers and consent fields', () => {
  const base = createPreparationState('hospital');
  assert.equal(selectProvider(base, 'facebook').selectedProvider, '');
  assert.equal(toggleConsent(base, 'marketing', true).termsAccepted, false);
  assert.deepEqual(Object.keys(toggleConsent(base, 'marketing', true)).sort(), Object.keys(base).sort());
});

test('regress never steps before the first screen', () => {
  const base = createPreparationState('doctor');
  assert.equal(regressStep(base).step, 'benefits');
  assert.equal(regressStep({ ...base, step: 'consent' }).step, 'provider');
});

test('furthest reachable step reflects collected non-sensitive state', () => {
  assert.equal(furthestReachableStep(createPreparationState('doctor')), 'provider');
  assert.equal(furthestReachableStep({ ...createPreparationState('doctor'), selectedProvider: 'naver' }), 'consent');
  assert.equal(furthestReachableStep(consented('doctor')), 'complete');
  assert.equal(furthestReachableStep({ role: '' }), 'benefits');
});

test('sanitize restores a valid resume state and drops unexpected or PII keys', () => {
  const restored = sanitizePreparationState({
    role: 'doctor',
    step: 'consent',
    selectedProvider: 'google',
    termsAccepted: true,
    ageConfirmed: true,
    privacyAcknowledged: true,
    // hostile / accidental extras that must never be trusted or kept
    email: 'someone@example.com',
    phone: '010-0000-0000',
    name: '홍길동'
  }, 'doctor');
  assert.deepEqual(Object.keys(restored).sort(), ['ageConfirmed', 'privacyAcknowledged', 'role', 'selectedProvider', 'step', 'termsAccepted']);
  assert.equal(restored.step, 'consent');
  assert.equal(restored.selectedProvider, 'google');
});

test('sanitize clamps a tampered step to what the state can actually reach', () => {
  // Claims to be complete but has no provider/consent — must fall back to provider.
  const clamped = sanitizePreparationState({ role: 'doctor', step: 'complete' }, 'doctor');
  assert.equal(clamped.step, 'provider');
  assert.equal(clamped.selectedProvider, '');

  // Provider chosen but consent missing — cannot resume on the complete screen.
  const partial = sanitizePreparationState({ role: 'hospital', step: 'complete', selectedProvider: 'kakao' }, 'hospital');
  assert.equal(partial.step, 'consent');
});

test('sanitize starts over when the stored role differs from the current signup path', () => {
  const stored = consented('doctor');
  const restored = sanitizePreparationState(stored, 'hospital');
  assert.equal(restored.role, 'hospital');
  assert.equal(restored.step, 'benefits');
  assert.equal(restored.selectedProvider, '');
});

test('sanitize tolerates malformed input', () => {
  for (const bad of [null, undefined, 'string', 42, []]) {
    assert.deepEqual(sanitizePreparationState(bad, 'doctor'), createPreparationState('doctor'));
  }
});

test('stored payload only ever contains whitelisted non-sensitive keys', () => {
  const stored = toStoredPreparation({
    role: 'doctor',
    step: 'consent',
    selectedProvider: 'email',
    termsAccepted: true,
    ageConfirmed: true,
    privacyAcknowledged: true,
    email: 'leak@example.com',
    licenseNumber: '12345'
  });
  assert.deepEqual(Object.keys(stored).sort(), ['ageConfirmed', 'privacyAcknowledged', 'role', 'selectedProvider', 'step', 'termsAccepted']);
  assert.equal('email' in stored, false);
  assert.equal('licenseNumber' in stored, false);
});

test('reset returns to the first step for the given role', () => {
  assert.deepEqual(resetPreparation('hospital'), createPreparationState('hospital'));
});

test('exposes the four expected steps and four provider options', () => {
  assert.deepEqual([...PREP_STEPS], ['benefits', 'provider', 'consent', 'complete']);
  assert.deepEqual([...PROVIDER_IDS], ['email', 'kakao', 'naver', 'google']);
});
