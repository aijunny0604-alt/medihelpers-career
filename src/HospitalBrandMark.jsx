import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { hospitalLogoWindow } from './hospitalBrandImage.js';

// Call with key={src}: a replacement image must not inherit a previous load error.
export default function HospitalBrandMark({ src, hospital }) {
  const [failed, setFailed] = useState(false);
  const frame = hospitalLogoWindow(src);
  return <span className="hospital-identity-logo">
    {failed ? <Building2 className="hospital-identity-placeholder" aria-label="병원 로고를 불러오지 못했습니다" /> :
      <span className={`hospital-logo-window${frame ? ' has-whitespace-window' : ''}`} style={frame ? { width: frame.width, height: frame.height } : undefined}>
        <img src={src} alt={`${hospital} 로고`} loading="lazy" decoding="async"
          style={frame ? { width: frame.imageWidth, height: frame.imageHeight, left: frame.left, top: frame.top } : undefined}
          onError={() => setFailed(true)} />
      </span>}
  </span>;
}
