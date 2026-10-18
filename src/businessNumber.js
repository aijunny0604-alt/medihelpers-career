// Format validation only; this does not verify business registration with an authority.
export function validateBusinessNumber(value) {
  const text = String(value ?? '').trim();
  if (!text) return '사업자등록번호를 입력해주세요.';
  if (!/^[0-9\s-]+$/.test(text) || text.replace(/[\s-]/g, '').length !== 10) return '사업자등록번호 숫자 10자리를 입력해주세요. 하이픈(-)은 있어도 됩니다.';
  return '';
}
