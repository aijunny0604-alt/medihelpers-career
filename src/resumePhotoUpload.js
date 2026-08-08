import { withBase } from './basePath.js';

export const RESUME_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateResumePhoto(file) {
  if (!file) return '';
  if (!RESUME_PHOTO_TYPES.includes(file.type)) return 'JPG·PNG·WEBP 사진만 등록할 수 있습니다.';
  if (file.size > RESUME_PHOTO_MAX_BYTES) return '프로필 사진은 5MB 이하만 등록할 수 있습니다.';
  return '';
}

export async function uploadResumePhoto(file) {
  const validationError = validateResumePhoto(file);
  if (validationError) throw new Error(validationError);
  const response = await fetch(withBase('/api/uploads'), {
    method:'POST', credentials:'same-origin',
    headers:{ 'content-type':file.type, 'x-upload-purpose':'resume-profile' },
    body:file,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.url) throw new Error(result.error || '프로필 사진을 저장하지 못했습니다.');
  return result.url;
}
