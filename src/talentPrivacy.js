export function maskTalentName(name = "") {
  const normalized = String(name).trim();
  if (!normalized) return "성명 비공개";
  return `${normalized.slice(0, 1)}${"○".repeat(Math.max(2, normalized.length - 1))}`;
}

export function canRevealTalentIdentity(capabilities = {}, identityConsent = false) {
  return Boolean(identityConsent && (capabilities.admin || capabilities.hospital));
}

export function talentDisplayName(person, canViewIdentity = false) {
  if (!person) return "성명 비공개";
  return canViewIdentity && person.identityConsent
    ? person.name
    : maskTalentName(person.name);
}
