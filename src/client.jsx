import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './main.jsx';
import './styles.css';

const render = () => createRoot(document.getElementById('root')).render(<App />);

// 로컬 개발(vite dev)에서만 가상 API 목을 설치한다. 배포 빌드에는 포함되지 않는다.
if (import.meta.env.DEV) {
  import('./devApiMock.js').then((m) => { m.installDevApiMock(); render(); }).catch(render);
} else {
  render();
}