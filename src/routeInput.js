export function decodeRouteId(value) {
  try { return decodeURIComponent(value); } catch { return ''; }
}

export function isValidRoutePath(path) {
  try { decodeURIComponent(path); return true; } catch { return false; }
}

export function memberTab(value) {
  return ['overview', 'notifications', 'ads', 'resume', 'inquiries', 'payments', 'profile'].includes(value) ? value : 'overview';
}
