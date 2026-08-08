import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { withBase } from './basePath.js';
import { dropImageFiles, pasteImageFiles } from './imageInput.js';

// 병원 배너·로고·시설 사진 업로드 컴포넌트.
// 파일 원본을 /api/uploads 로 POST하고 저장 URL을 받는다.
// - 배포(Cloudflare): R2에 저장 후 /api/uploads/<key> URL 반환.
// - 로컬(devApiMock): data URL을 반환해 미리보기·저장이 그대로 동작.
const TYPE_OK = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024;

export default function ImageUpload({ label, hint, purpose = 'photo', value, onChange, aspect = '16 / 9' }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  async function pick(file) {
    if (!file) return;
    setError('');
    if (!TYPE_OK.includes(file.type)) { setError('JPG·PNG·WEBP·GIF 이미지만 올릴 수 있어요.'); return; }
    if (file.size > MAX_BYTES) { setError('이미지는 5MB 이하만 올릴 수 있어요.'); return; }
    setBusy(true);
    try {
      const res = await fetch(withBase('/api/uploads'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': file.type, 'x-upload-purpose': purpose },
        body: file,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || '업로드에 실패했어요. 잠시 후 다시 시도해 주세요.');
      onChange(data.url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`image-upload ${dragging ? 'is-dragging' : ''}`}
      onDragEnter={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; if (!busy) setDragging(true); }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={(event) => { setDragging(false); if (!busy) dropImageFiles(event, (files) => pick(files[0])); else event.preventDefault(); }}
      onPaste={(event) => { if (!busy) pasteImageFiles(event, (files) => pick(files[0])); }}
    >
      <span className="image-upload-label">{label}{hint ? <small>{hint}</small> : null}</span>
      {value ? (
        <div className="image-upload-preview" style={{ aspectRatio: aspect }}>
          <img src={value} alt={`${label} 미리보기`} />
          <button type="button" className="image-upload-remove" onClick={() => onChange('')} aria-label="이미지 제거"><X /></button>
        </div>
      ) : (
        <button type="button" className="image-upload-drop" style={{ aspectRatio: aspect }} onClick={() => inputRef.current && inputRef.current.click()} disabled={busy}>
          {busy
            ? <><Loader2 className="image-upload-spin" /> <span>올리는 중…</span></>
            : <><ImagePlus /> <span>클릭·드래그·붙여넣기</span><small>Ctrl+V 지원 · JPG·PNG·WEBP · 5MB 이하</small></>}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files && e.target.files[0]); e.target.value = ''; }} />
      {error ? <p className="image-upload-error" role="alert">{error}</p> : null}
    </div>
  );
}
