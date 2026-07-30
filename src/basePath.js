const rawBase = import.meta.env.BASE_URL;
export const appBase = rawBase === '/' ? '' : rawBase.replace(/\/$/, '');
// data:·blob: URL(업로드 이미지 미리보기·인라인 자산)은 base 경로를 붙이면 깨지므로 그대로 통과시킨다.
export const withBase = (path) => !path || /^(?:https?:|data:|blob:|mailto:|tel:|#)/.test(path) ? path : `${appBase}${path.startsWith('/') ? path : `/${path}`}`;
