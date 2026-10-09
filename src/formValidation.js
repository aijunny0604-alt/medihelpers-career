export function fieldValidationMessage(field) {
  const v = field.validity || {};
  if (v.valueMissing) {
    if (field.type === 'checkbox') return '계속하려면 이 필수 동의에 체크해주세요.';
    if (field.type === 'radio' || field.tagName === 'SELECT') return '항목을 하나 선택해주세요.';
    return '비어 있습니다. 내용을 입력해주세요.';
  }
  if (v.tooShort) return `최소 ${field.minLength}자 이상 입력해주세요.`;
  if (v.tooLong) return `최대 ${field.maxLength}자까지 입력할 수 있습니다.`;
  if (v.typeMismatch) return field.type === 'email'
    ? '이메일을 이름@도메인 형식으로 입력해주세요. 예: name@example.com'
    : field.type === 'url' ? 'https://를 포함한 홈페이지 주소를 입력해주세요.' : '입력 형식을 확인해주세요.';
  if (v.rangeUnderflow) return `${field.min} 이상의 값을 입력해주세요.`;
  if (v.rangeOverflow) return `${field.max} 이하의 값을 입력해주세요.`;
  if (v.badInput) return '숫자 형식으로 입력해주세요.';
  if (v.stepMismatch) return `허용되는 간격${field.step ? `(${field.step})` : ''}에 맞는 숫자를 입력해주세요.`;
  if (v.patternMismatch) return field.dataset?.validationMessage || field.title || '요구되는 형식과 다릅니다. 입력란의 예시를 확인해주세요.';
  return field.dataset?.validationMessage || (v.customError && field.validationMessage) || '입력란 아래의 오류 안내를 확인하고 내용을 수정해주세요.';
}

export function fieldValidationLabel(field) {
  return (field.labels?.[0]?.querySelector('span')?.textContent || field.getAttribute('aria-label')
    || field.labels?.[0]?.textContent || field.placeholder || '입력 항목').trim().slice(0, 90);
}
