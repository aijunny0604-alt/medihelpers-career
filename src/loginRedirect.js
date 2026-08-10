const isSafeInternalPath = (value) => (
  typeof value === 'string'
  && value.startsWith('/')
  && !value.startsWith('//')
  && !/[\\\r\n]/.test(value)
);

const isAuthPage = (value) => {
  const pathname = String(value || '').split(/[?#]/)[0].replace(/\/$/, '') || '/';
  return pathname === '/login' || pathname === '/signup' || pathname.startsWith('/signup/') || pathname === '/account/recovery';
};

export function resolveLoginDestination({ search = '', referrer = '', origin = '', role = '' } = {}) {
  const fallback = role === 'admin' ? '/admin/console' : '/';
  const explicit = new URLSearchParams(search).get('next');
  if (isSafeInternalPath(explicit) && !isAuthPage(explicit)) return explicit;

  try {
    const previous = new URL(referrer);
    const previousPath = `${previous.pathname}${previous.search}${previous.hash}`;
    if (previous.origin === origin && isSafeInternalPath(previousPath) && !isAuthPage(previousPath)) return previousPath;
  } catch {}

  return fallback;
}

export { isSafeInternalPath };
