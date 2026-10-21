import { inspectUploadImage } from '../server/uploadImageValidation.js';

export const IMAGE_SOURCE_MAX_BYTES = 20 * 1024 * 1024;
export const IMAGE_OUTPUT_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_MAX_PIXELS = 32_000_000;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const limits = { logo:1200, banner:2400, facility:2048, poster:4000, 'resume-profile':1200, photo:2048 };

export function imageOutputSize(width, height, purpose) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width > 24000 || height > 24000 || width * height > IMAGE_MAX_PIXELS) {
    throw new Error('이미지 해상도가 너무 크거나 올바르지 않습니다. 3,200만 화소 이하의 원본을 선택해주세요.');
  }
  const ratio = Math.min(1, (limits[purpose] || limits.photo) / Math.max(width, height));
  return { width:Math.max(1, Math.round(width * ratio)), height:Math.max(1, Math.round(height * ratio)) };
}

function deadline(promise, timeoutMs, message, onTimeout = () => {}) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => { onTimeout(); reject(new Error(message)); }, timeoutMs);
  })]).finally(() => clearTimeout(timer));
}

function decodeImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    let settled = false;
    const dispose = () => { image.onload = null; image.onerror = null; image.src = ''; URL.revokeObjectURL(url); };
    const fail = () => {
      if (settled) return;
      settled = true; clearTimeout(timer); dispose();
      reject(new Error('이미지를 읽을 수 없습니다. 손상되지 않은 JPG·PNG·WEBP 원본을 다시 선택해주세요.'));
    };
    const timer = setTimeout(fail, 20000);
    image.onload = async () => {
      try {
        if (image.decode) await image.decode();
        if (settled) return;
        if (!image.naturalWidth || !image.naturalHeight) { fail(); return; }
        settled = true; clearTimeout(timer);
        resolve({ source:image, width:image.naturalWidth, height:image.naturalHeight, close:dispose });
      } catch { fail(); }
    };
    image.onerror = fail;
    image.decoding = 'async';
    image.src = url;
  });
}

async function encodeImage(image, width, height, type, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  try {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('이 브라우저에서 이미지를 처리할 수 없습니다. 다른 브라우저에서 다시 시도해주세요.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image.source, 0, 0, width, height);
    return await deadline(new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob?.size ? resolve(blob) : reject(new Error('이미지를 변환하지 못했습니다. 원본 파일을 다시 선택해주세요.')), type, quality);
    }), 15000, '이미지 처리 시간이 초과됐습니다. 조금 작은 원본으로 다시 시도해주세요.');
  } finally { canvas.width = 0; canvas.height = 0; }
}

// 같은 파일을 미리보기와 제출에서 다시 처리하지 않는다. 실패 결과는 캐시하지 않는다.
export function createImageOptimizer({ decode = decodeImage, encode = encodeImage, inspect = inspectUploadImage } = {}) {
  const cache = new WeakMap();
  return function prepare(file, purpose = 'photo') {
    if (!file || typeof file.arrayBuffer !== 'function') return Promise.reject(new Error('이미지 파일을 선택해주세요.'));
    let variants = cache.get(file);
    if (!variants) { variants = new Map(); cache.set(file, variants); }
    if (variants.has(purpose)) return variants.get(purpose);
    const work = (async () => {
      if (!IMAGE_TYPES.includes(file.type)) throw new Error('JPG·PNG·WEBP 이미지 파일만 등록할 수 있습니다.');
      if (!file.size || file.size > IMAGE_SOURCE_MAX_BYTES) throw new Error('원본 이미지는 0바이트보다 크고 20MB 이하여야 합니다.');
      const bytes = new Uint8Array(await deadline(file.arrayBuffer(), 15000, '이미지 파일을 읽는 시간이 초과됐습니다. 다시 선택해주세요.'));
      const header = inspect(bytes, file.type);
      if (!header) throw new Error('이미지 형식이나 파일 내용이 올바르지 않습니다. 원본 이미지를 다시 선택해주세요.');
      imageOutputSize(header.width, header.height, purpose);
      const image = await decode(file);
      try {
        let { width, height } = imageOutputSize(image.width, image.height, purpose);
        let blob;
        // PNG는 먼저 무손실로 저장한다. 큰 PNG는 알파를 보존하는 WebP로 줄인다.
        for (let attempt = 0; attempt < 5; attempt++) {
          const type = file.type === 'image/jpeg' ? 'image/jpeg' : file.type === 'image/png' && attempt === 0 ? 'image/png' : 'image/webp';
          blob = await encode(image, width, height, type, attempt === 0 ? 0.94 : 0.9);
          if (!blob || !IMAGE_TYPES.includes(blob.type) || !blob.size) throw new Error('이미지를 변환하지 못했습니다. 다시 선택해주세요.');
          if (blob.size <= IMAGE_OUTPUT_MAX_BYTES) break;
          if (attempt > 0 || file.type !== 'image/png') { width = Math.max(1, Math.floor(width * 0.8)); height = Math.max(1, Math.floor(height * 0.8)); }
        }
        if (blob.size > IMAGE_OUTPUT_MAX_BYTES) throw new Error('이미지를 5MB 이하로 줄이지 못했습니다. 더 작은 원본을 선택해주세요.');
        const extension = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp' }[blob.type];
        const name = String(file.name || 'image').replace(/\.[^.]+$/, '') + '.' + extension;
        const output = new File([blob], name, { type:blob.type, lastModified:Date.now() });
        const notice = purpose === 'banner' && (image.width < 900 || image.height < 300)
          ? `원본 ${image.width}×${image.height}px · 작은 이미지는 확대해도 선명해지지 않습니다. 가능하면 1500×500px 원본을 선택해주세요.`
          : purpose === 'logo' && Math.max(image.width, image.height) < 300
            ? `원본 ${image.width}×${image.height}px · 작은 로고는 선명도를 복원할 수 없습니다. 더 큰 원본을 권장합니다.` : '';
        const result = { file:output, width, height, originalWidth:image.width, originalHeight:image.height, originalBytes:file.size, bytes:output.size, notice };
        cache.set(output, new Map([[purpose, Promise.resolve(result)]]));
        return result;
      } finally { image.close?.(); }
    })();
    variants.set(purpose, work);
    work.catch(() => { if (variants.get(purpose) === work) variants.delete(purpose); });
    return work;
  };
}

export const prepareImageUpload = createImageOptimizer();
