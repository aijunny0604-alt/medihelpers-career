// Five calendar months, clamping to the target month's last day.
export function postPublicUntil(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(String(value).includes('T') ? value : String(value).replace(' ', 'T') + 'Z');
  if (Number.isNaN(date.getTime())) return '';
  date.setTime(date.getTime() + 9 * 60 * 60 * 1000); // Calendar dates in Korea.
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 5);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  date.setTime(date.getTime() - 9 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function postStatusLabel(post) {
  return post.status === 'active' ? '공개 중' : post.hiddenReason === 'inactive' ? '5개월 미관리 · 자동 비공개' : '비공개';
}

export function postDeadlineLabel(value) {
  if (!value) return '확인 중';
  const date = new Date(String(value).includes('T') ? value : String(value).replace(' ', 'T') + 'Z');
  return Number.isNaN(date.getTime()) ? '확인 중' : date.toLocaleDateString('sv-SE', {timeZone:'Asia/Seoul'});
}
