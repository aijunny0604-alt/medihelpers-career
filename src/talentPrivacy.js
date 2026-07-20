export function maskTalentName(name = "") {
  const normalized = String(name).trim();
  if (!normalized) return "성명 비공개";
  return `${normalized.slice(0, 1)}${"○".repeat(Math.max(2, normalized.length - 1))}`;
}

// [보안] 실명 공개 조건: ①후보 본인 동의 ②관리자이거나 '열람권이 확인된' 병원.
// 병원 회원이라는 사실만으로는 공개하지 않는다(열람권 미결제 상태에서 실명이 새는 것을 막는다).
// 실제 상세(연락처·이력서)는 서버(GET /api/talent-detail/:id)가 talent_unlocks로 재검증하므로,
// 이 함수는 목록·요약 화면의 표시 규칙을 통일하기 위한 방어선이다.
export function canRevealTalentIdentity(capabilities = {}, identityConsent = false) {
  if (!identityConsent) return false;
  if (capabilities.admin) return true;
  return Boolean(capabilities.hospital && capabilities.talentUnlocked);
}

export function talentDisplayName(person, canViewIdentity = false) {
  if (!person) return "성명 비공개";
  return canViewIdentity && person.identityConsent
    ? person.name
    : maskTalentName(person.name);
}
