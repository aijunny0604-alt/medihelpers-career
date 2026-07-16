const rawBase = import.meta.env.BASE_URL;
export const appBase = rawBase === '/' ? '' : rawBase.replace(/\/$/, '');
export const withBase = (path) => !path || /^(?:https?:|mailto:|tel:|#)/.test(path) ? path : `${appBase}${path.startsWith('/') ? path : `/${path}`}`;
