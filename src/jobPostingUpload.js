import { withBase } from './basePath.js';

export const JOB_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const JOB_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function uploadJobImage(file, purpose) {
  if (!file) return '';
  if (!JOB_IMAGE_TYPES.includes(file.type)) {
    throw new Error('PNG·JPG·WEBP 이미지 파일만 등록할 수 있습니다.');
  }
  if (file.size > JOB_IMAGE_MAX_BYTES) {
    throw new Error('이미지는 장당 5MB 이하만 등록할 수 있습니다.');
  }
  const response = await fetch(withBase('/api/uploads'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': file.type, 'x-upload-purpose': purpose },
    body: file,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.url) {
    throw new Error(result.error || '이미지를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
  return result.url;
}
