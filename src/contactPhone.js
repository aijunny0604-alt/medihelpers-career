export function normalizeContactPhone(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (!/^[0-9 ()-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  if (!/^(?:01[016789]\d{7,8}|02\d{7,8}|0[3-6][1-5]\d{7,8}|070\d{8}|050\d{8,9})$/.test(digits)) return null;
  const prefix = digits.startsWith('02') ? 2 : (digits.startsWith('050') && digits.length === 12 ? 4 : 3);
  return digits.slice(0, prefix) + '-' + digits.slice(prefix, -4) + '-' + digits.slice(-4);
}
