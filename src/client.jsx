import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './main.jsx';
import './styles.css';

const render = () => createRoot(document.getElementById('root')).render(<App />);

// 관심공고(찜) 서버→로컬 하이드레이션.
// 공고·인재 카드의 하트는 마운트 시 localStorage를 1회 읽어 초기화하므로, 렌더 전에
// 서버(D1)에 저장된 찜 목록을 로컬 키에 병합해 두면 다른 PC에서도 하트 표시가 일치한다.
// 느린/실패 응답에 첫 화면이 묶이지 않도록 600ms 안에 무조건 렌더한다(비로그인 401도 즉시 통과).
async function hydrateSavedJobs() {
  try {
    const fetched = fetch('/api/saved-jobs', { credentials: 'same-origin', headers: { accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
    const data = await Promise.race([fetched, new Promise((resolve) => setTimeout(() => resolve(null), 600))]);
    if (!data || !Array.isArray(data.saved) || !data.saved.length) return;
    const jobIds = [];
    const talentIds = [];
    for (const item of data.saved) {
      const id = item && (item.jobId || item.id);
      if (!id) continue;
      (item.kind === 'talent' ? talentIds : jobIds).push(id);
    }
    const merge = (key, ids) => {
      if (!ids.length) return;
      let current = [];
      try { current = JSON.parse(localStorage.getItem(key) || '[]'); } catch { current = []; }
      if (!Array.isArray(current)) current = [];
      const next = Array.from(new Set([...current, ...ids]));
      if (next.length !== current.length) {
        try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      }
    };
    merge('medihelpers_saved_jobs', jobIds);
    merge('medihelpers_saved_talent', talentIds);
  } catch {
    // 하이드레이션 실패는 치명적이지 않다(하트 표시만 이 기기 로컬 기준으로 유지).
  }
}

// 로컬 개발(vite dev)에서만 가상 API 목을 설치한다. 배포 빌드에는 포함되지 않는다.
if (import.meta.env.DEV) {
  import('./devApiMock.js').then((m) => { m.installDevApiMock(); return hydrateSavedJobs(); }).then(render).catch(render);
} else {
  hydrateSavedJobs().then(render).catch(render);
}