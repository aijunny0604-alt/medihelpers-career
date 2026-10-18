// Only known React screens use SPA navigation. Payment callbacks, legacy pages,
// downloads, fragments, external links and explicit reloads retain browser behavior.
export function internalScreenRoute(href, currentUrl, base = '') {
  if (!href || href.startsWith('#')) return null;
  try {
    const current = new URL(currentUrl);
    const url = new URL(href, current);
    if (url.origin !== current.origin || !/^https?:$/.test(url.protocol) || url.hash || url.username || url.password) return null;
    if (base && !url.pathname.startsWith(base + '/')) return null;
    const path = (base ? url.pathname.slice(base.length) : url.pathname).replace(/\/$/, '') || '/';
    const exact = ['/', '/jobs', '/medical-staff', '/headhunting', '/advertise', '/advertise/apply', '/talent-unlock', '/resume', '/job-seeker-posts/new', '/request/job-seeker', '/request/hiring', '/login', '/signup', '/signup/doctor', '/signup/hospital', '/signup/welcome', '/account', '/account/recovery', '/mypage', '/member-center', '/admin', '/admin/console', '/admin/consultations', '/admin/recruitment-crm', '/admin/post', '/terms', '/privacy', '/refund', '/withdrawal', '/about', '/talent', '/professions'];
    const detail = /^\/(?:jobs|headhunting\/posts|medical-staff\/(?:jobs|talents)|mypage\/(?:inquiries|ads))\/[^/]+$/.test(path)
      || /^\/job-seeker-posts\/[^/]+\/edit$/.test(path);
    return exact.includes(path) || detail ? path + url.search : null;
  } catch { return null; }
}

export function canHandleNavigationClick(event, anchor) {
  return !event.defaultPrevented && event.button === 0
    && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
    && (!anchor.target || anchor.target === '_self')
    && !anchor.hasAttribute('download') && !anchor.hasAttribute('data-full-reload')
    && !String(anchor.rel || '').split(/\s+/).includes('external');
}
