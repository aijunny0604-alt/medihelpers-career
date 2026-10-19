import React, { useEffect, useRef } from 'react';
import { withBase } from './basePath.js';

export default function HeroMedia() {
  const videoRef = useRef(null);
  useEffect(() => {
    const video = videoRef.current;
    const play = () => {
      if (!video || document.visibilityState === 'hidden' || !video.paused) return;
      video.defaultMuted = true;
      video.muted = true;
      // 브라우저가 첫 자동 재생을 제한하면 첫 사용자 동작·탭 복귀 때 재시도한다.
      video.play()?.catch(() => {});
    };
    play();
    video?.addEventListener('canplay', play);
    window.addEventListener('pageshow', play);
    document.addEventListener('visibilitychange', play);
    document.addEventListener('pointerdown', play);
    document.addEventListener('keydown', play);
    return () => {
      video?.removeEventListener('canplay', play);
      window.removeEventListener('pageshow', play);
      document.removeEventListener('visibilitychange', play);
      document.removeEventListener('pointerdown', play);
      document.removeEventListener('keydown', play);
    };
  }, []);
  return <>
    <img className="home-video-hero-bg" src={withBase('/hero-medihelpers-poster.jpg')} alt="" fetchPriority="high" decoding="async" />
    <video ref={videoRef} className="home-video-hero-bg" autoPlay muted loop playsInline preload="auto" aria-hidden="true" poster={withBase('/hero-medihelpers-poster.jpg')}>
      <source src={withBase('/hero-medihelpers.mp4')} type="video/mp4" />
    </video>
  </>;
}
