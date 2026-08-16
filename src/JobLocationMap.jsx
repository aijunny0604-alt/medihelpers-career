import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

// 공고 상세의 근무지 지도.
// 카카오맵 JS SDK를 주소로 지오코딩해서 표시한다.
// 앱키(VITE_KAKAO_MAP_KEY)가 없거나 SDK 로드에 실패하면 지도를 숨기고
// 기존처럼 '지도에서 보기' 링크만 남긴다(치명적 실패 없음).

const KAKAO_KEY = (import.meta.env && import.meta.env.VITE_KAKAO_MAP_KEY) || '';

let sdkPromise = null;
function loadKakaoMapSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (!KAKAO_KEY) return Promise.reject(new Error('no kakao map key'));
  if (window.kakao && window.kakao.maps && window.kakao.maps.services) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    // autoload=false + kakao.maps.load 로 서비스(지오코더)까지 준비되면 resolve.
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_KEY)}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      try { window.kakao.maps.load(() => resolve()); }
      catch (error) { sdkPromise = null; reject(error); }
    };
    script.onerror = () => { sdkPromise = null; reject(new Error('kakao map sdk load failed')); };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export default function JobLocationMap({ address, hospital, mapUrl }) {
  const hostRef = useRef(null);
  const [ready, setReady] = useState(false);
  const query = String(address || '').trim();

  useEffect(() => {
    if (!query || !hostRef.current) return undefined;
    let cancelled = false;
    loadKakaoMapSdk()
      .then(() => {
        if (cancelled || !hostRef.current) return;
        const { kakao } = window;
        const geocoder = new kakao.maps.services.Geocoder();
        const draw = (lat, lng) => {
          if (cancelled || !hostRef.current) return;
          const center = new kakao.maps.LatLng(lat, lng);
          const map = new kakao.maps.Map(hostRef.current, { center, level: 4 });
          const marker = new kakao.maps.Marker({ position: center });
          marker.setMap(map);
          if (hospital) {
            new kakao.maps.InfoWindow({
              position: center,
              content: `<div style="padding:6px 10px;font-size:12px;font-weight:700;white-space:nowrap">${String(hospital).replace(/[<>&"]/g, '')}</div>`,
            }).open(map, marker);
          }
          setReady(true);
        };
        // 도로명/지번 주소 → 좌표. 실패하면 키워드 검색으로 한 번 더 시도한다.
        geocoder.addressSearch(query, (result, status) => {
          if (status === kakao.maps.services.Status.OK && result[0]) {
            draw(Number(result[0].y), Number(result[0].x));
            return;
          }
          const places = new kakao.maps.services.Places();
          places.keywordSearch(`${hospital || ''} ${query}`.trim(), (data, kwStatus) => {
            if (kwStatus === kakao.maps.services.Status.OK && data[0]) draw(Number(data[0].y), Number(data[0].x));
          });
        });
      })
      .catch(() => { /* 앱키 미설정·로드 실패: 지도 없이 링크만 노출 */ });
    return () => { cancelled = true; };
  }, [query, hospital]);

  if (!query) return null;

  return (
    <div className="job-location-map">
      <div className="job-location-head">
        <MapPin size={16} />
        <strong>근무지</strong>
        <span>{query}</span>
        {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer noopener">지도에서 보기</a>}
      </div>
      {/* 지도가 준비되기 전/실패 시에는 빈 회색칸이 남지 않도록 감춘다. */}
      <div ref={hostRef} className={`job-location-canvas ${ready ? 'is-ready' : ''}`} aria-label={`${hospital || ''} 위치 지도`} />
    </div>
  );
}
