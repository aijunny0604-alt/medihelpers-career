import { withBase } from './basePath.js';
import { requestResumeWrite } from './resumeApi.js';

export const RESUME_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateResumePhoto(file) {
  if (!file) return '';
  if (!Number.isFinite(file.size) || file.size <= 0) return '빈 사진 파일입니다. 다른 사진을 선택해주세요.';
  if (!RESUME_PHOTO_TYPES.includes(file.type)) return 'JPG·PNG·WEBP 사진만 등록할 수 있습니다.';
  if (file.size > RESUME_PHOTO_MAX_BYTES) return '프로필 사진은 5MB 이하만 등록할 수 있습니다.';
  return '';
}

export function isResumePhotoUrl(value) {
  const prefix = withBase('/api/uploads/profiles/');
  return typeof value === 'string' && value.startsWith(prefix) && /^[A-Za-z0-9_-]+\/resume-profile\/[A-Za-z0-9_-]+\.(png|jpg|webp)$/.test(value.slice(prefix.length));
}

export async function uploadResumePhoto(file, options) {
  const validationError = validateResumePhoto(file);
  if (validationError) throw new Error(validationError);
  const result = await requestResumeWrite(withBase('/api/uploads'), {
    headers:{ 'content-type':file.type, 'x-upload-purpose':'resume-profile' },
    body:file,
  }, options);
  if (result.uploaded !== true || !isResumePhotoUrl(result.url)) throw new Error('프로필 사진 저장 완료를 확인하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해주세요.');
  return result.url;
}
