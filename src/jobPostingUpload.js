import { withBase } from './basePath.js';
import { IMAGE_OUTPUT_MAX_BYTES, IMAGE_TYPES, prepareImageUpload } from './imageOptimization.js';

export const JOB_IMAGE_MAX_BYTES = IMAGE_OUTPUT_MAX_BYTES;
export const JOB_IMAGE_TYPES = IMAGE_TYPES;

export function isUploadedJobImageUrl(value, allowDataUrl = Boolean(import.meta.env?.DEV)) {
  if (typeof value !== 'string') return false;
  if (allowDataUrl && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)) return true;
  const prefix = withBase('/api/uploads/hospitals/');
  return value.startsWith(prefix) && /^[A-Za-z0-9_-]+\/(?:logo|banner|facility|poster|photo)\/[A-Za-z0-9_-]+\.(png|jpg|webp)$/.test(value.slice(prefix.length));
}

export function createJobImageUploader({ optimize = prepareImageUpload, fetcher = (...args) => fetch(...args), timeoutMs = 30000, allowDataUrl = Boolean(import.meta.env?.DEV) } = {}) {
  return async function upload(file, purpose) {
    if (!file) return '';
    const prepared = await optimize(file, purpose);
    const controller = new AbortController();
    let timer;
    try {
      const send = (async () => {
        const response = await fetcher(withBase('/api/uploads'), {
          method:'POST', credentials:'same-origin',
          headers:{ 'content-type':prepared.file.type, 'x-upload-purpose':purpose },
          body:prepared.file, signal:controller.signal,
        });
        const result = await response.json();
        if (!response.ok || result?.uploaded !== true || !isUploadedJobImageUrl(result.url, allowDataUrl)) {
          throw new Error(result?.error || '이미지 저장 완료를 확인하지 못했습니다. 다시 시도해주세요.');
        }
        return result.url;
      })();
      return await Promise.race([send, new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('이미지 전송 시간이 초과됐습니다. 공고는 아직 제출되지 않았습니다. 다시 시도해주세요.')); }, timeoutMs);
      })]);
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError) throw new Error('이미지 전송 결과를 확인하지 못했습니다. 연결 상태를 확인하고 다시 시도해주세요.');
      throw error;
    } finally { clearTimeout(timer); }
  };
}

export const uploadJobImage = createJobImageUploader();
