// Verified whitespace windows for the immutable, original Rankup logo files.
// This only changes their viewport; source pixels, lettering and proportions stay intact.
const legacyLogoWindows = {
  '2cd972f2b8155acd837d783d5f6d726d6e60c34d4dc4355ab2729e2bf2760e3e': [42, 24, 123, 104],
  '6258da49cc0d562cf9c18a9b7c1bf47e6db5fc53c615c0918f4f9a9646cfb986': [12, 41, 170, 79],
  'bbeed3a66398fcdd621e430847f0b2b86873d78e7af442b0f730c93e3d450394': [22, 36, 171, 65],
  '2cb721b4c8f49f4d6b083677e3a31ad4c5996c53dca8732ad93bc347cae0aeed': [5, 31, 189, 91],
};

export function hospitalLogoWindow(source) {
  const match = String(source || '').match(/(?:^|\/)legacy-media\/([a-f0-9]{64})\.png(?:[?#]|$)/);
  const rect = match && legacyLogoWindows[match[1]];
  if (!rect) return null;
  const [x, y, width, height] = rect;
  const scale = Math.min(1, 180 / width, 82 / height);
  return { width: width * scale, height: height * scale,
    imageWidth: 207 * scale, imageHeight: 160 * scale, left: -x * scale, top: -y * scale };
}

export function bannerResolutionNotice(width, height) {
  if (!(Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0)) return '';
  if (width >= 900 && height >= 300) return '';
  return `현재 이미지 ${width}×${height}px · 크게 표시하면 흐려질 수 있습니다. 가능하면 1500×500px 원본을 올려주세요. 이 이미지로도 등록할 수 있습니다.`;
}
