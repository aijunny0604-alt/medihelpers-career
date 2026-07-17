import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allConsentsAccepted,
  clearDraftFields,
  createEmptyDraft,
  fieldsForRole,
  formatKoreanPhone,
  setAllConsents,
  validateApplicationDraft,
  validateField
} from './signupFields.js';

// 검증을 통과하는 공통 입력값입니다. (필수 동의 3종 포함)
function validDoctorDraft(overrides = {}) {
  return {
    ...createEmptyDraft('doctor'),
    name: '홍길동',
    phone: '010-1234-5678',
    email: 'user@example.com',
    password: 'medi1234',
    passwordConfirm: 'medi1234',
    termsAccepted: true,
    privacyAccepted: true,
    ageConfirmed: true,
    ...overrides
  };
}

function validHospitalDraft(overrides = {}) {
  return {
    ...validDoctorDraft(),
    role: 'hospital',
    hospitalName: '서울메디컬센터',
    hospitalRole: '채용 담당자',
    representativeName: '김대표',
    institutionType: '병원',
    institutionPhone: '02-1234-5678',
    postalCode: '06236',
    address: '서울 강남구 테헤란로 123',
    ...overrides
  };
}

test('fieldsForRole: 병원만 조건부 기관 필드를 추가한다', () => {
  assert.deepEqual(fieldsForRole('doctor'), ['name', 'phone', 'email', 'password', 'passwordConfirm']);
  assert.deepEqual(fieldsForRole('hospital'), [
    'name', 'hospitalRole', 'department', 'phone', 'email', 'password', 'passwordConfirm',
    'hospitalName', 'representativeName', 'institutionType', 'institutionPhone',
    'postalCode', 'address', 'addressDetail', 'website', 'businessNumber', 'fax'
  ]);
  // 알 수 없는 역할은 공통 필드만 반환한다.
  assert.deepEqual(fieldsForRole(''), ['name', 'phone', 'email', 'password', 'passwordConfirm']);
});

test('의료인: 올바른 입력은 통과한다', () => {
  const result = validateApplicationDraft(validDoctorDraft(), 'doctor');
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('의료인: 빈 필수 입력은 각 필드 오류를 낸다', () => {
  const result = validateApplicationDraft(createEmptyDraft('doctor'), 'doctor');
  assert.equal(result.valid, false);
  for (const field of ['name', 'phone', 'email', 'password', 'passwordConfirm', 'termsAccepted', 'privacyAccepted', 'ageConfirmed']) {
    assert.ok(result.errors[field], `${field} 오류 필요`);
  }
  // 병원 전용 필드는 의료인 검증 대상이 아니다.
  assert.equal(result.errors.hospitalName, undefined);
  assert.equal(result.errors.hospitalRole, undefined);
});

test('병원: 기관명·담당자 역할과 기관 필수정보가 비면 오류가 난다', () => {
  const draft = validHospitalDraft({
    hospitalName: '',
    hospitalRole: '',
    representativeName: '',
    institutionType: '',
    institutionPhone: '',
    postalCode: '',
    address: ''
  });
  const result = validateApplicationDraft(draft, 'hospital');
  assert.equal(result.valid, false);
  assert.ok(result.errors.hospitalName);
  assert.ok(result.errors.hospitalRole);
  assert.ok(result.errors.representativeName);
  assert.ok(result.errors.institutionType);
  assert.ok(result.errors.institutionPhone);
  assert.ok(result.errors.postalCode);
  assert.ok(result.errors.address);
});

test('병원: 조건부 필드를 채우면 통과한다', () => {
  const result = validateApplicationDraft(validHospitalDraft(), 'hospital');
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('비밀번호 규칙: 8자 미만·영문숫자 미포함은 거부한다', () => {
  assert.ok(validateField('password', { password: 'medi1' }), '8자 미만 거부');
  assert.ok(validateField('password', { password: 'medihelpers' }), '숫자 없음 거부');
  assert.ok(validateField('password', { password: '12345678' }), '영문 없음 거부');
  assert.equal(validateField('password', { password: 'medi1234' }), '');
});

test('비밀번호 확인: 불일치는 오류, 일치는 통과한다', () => {
  assert.ok(validateField('passwordConfirm', { password: 'medi1234', passwordConfirm: 'medi9999' }));
  assert.equal(validateField('passwordConfirm', { password: 'medi1234', passwordConfirm: 'medi1234' }), '');
});

test('필수 동의: 하나라도 빠지면 검증에 실패한다', () => {
  const missingPrivacy = validDoctorDraft({ privacyAccepted: false });
  const result = validateApplicationDraft(missingPrivacy, 'doctor');
  assert.equal(result.valid, false);
  assert.ok(result.errors.privacyAccepted);
});

test('전체 동의 토글: setAllConsents / allConsentsAccepted', () => {
  const empty = createEmptyDraft('doctor');
  assert.equal(allConsentsAccepted(empty), false);
  const allOn = setAllConsents(empty, true);
  assert.equal(allConsentsAccepted(allOn), true);
  const allOff = setAllConsents(allOn, false);
  assert.equal(allConsentsAccepted(allOff), false);
});

test('휴대폰 포맷팅: 숫자 입력을 010-XXXX-XXXX 형태로 정규화한다', () => {
  assert.equal(formatKoreanPhone('01012345678'), '010-1234-5678');
  assert.equal(formatKoreanPhone('010-1234-5678'), '010-1234-5678');
  // 입력 도중 부분 포맷팅
  assert.equal(formatKoreanPhone('0101234'), '010-1234');
  // 11자리를 초과하는 입력은 잘라낸다
  assert.equal(formatKoreanPhone('010123456789999'), '010-1234-5678');
  // 잘못된 번호는 검증에서 거부한다
  assert.ok(validateField('phone', { phone: '02-123-4567' }));
  assert.equal(validateField('phone', { phone: '010-1234-5678' }), '');
});

test('초기화: clearDraftFields 는 PII 없는 깨끗한 draft와 false 동의를 반환한다', () => {
  const dirty = validHospitalDraft({ name: '민감정보', password: 'secret12' });
  const cleared = clearDraftFields(dirty);
  // 회원 유형은 유지한다
  assert.equal(cleared.role, 'hospital');
  // 모든 PII 필드는 빈 문자열이어야 한다
  for (const field of fieldsForRole('hospital')) {
    assert.equal(cleared[field], '', `${field} 는 비워져야 한다`);
  }
  // 모든 필수 동의는 false 로 재설정된다
  assert.equal(cleared.termsAccepted, false);
  assert.equal(cleared.privacyAccepted, false);
  assert.equal(cleared.ageConfirmed, false);
  assert.equal(allConsentsAccepted(cleared), false);
});
