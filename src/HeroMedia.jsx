import React, { useEffect, useState } from 'react';
import { withBase } from './basePath.js';

export default function HeroMedia() {
  const [playVideo, setPlayVideo] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1025px)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection;
    const update = () => setPlayVideo(desktop.matches && !motion.matches && !connection?.saveData);
    update();
    desktop.addEventListener('change', update);
    motion.addEventListener('change', update);
    connection?.addEventListener?.('change', update);
    return () => {
      desktop.removeEventListener('change', update);
      motion.removeEventListener('change', update);
      connection?.removeEventListener?.('change', update);
    };
  }, []);
  return <>
    <img className="home-video-hero-bg" src={withBase('/hero-medihelpers-poster.jpg')} alt="" fetchPriority="high" decoding="async" />
    {playVideo && <video className="home-video-hero-bg" autoPlay muted loop playsInline preload="none" aria-hidden="true" poster={withBase('/hero-medihelpers-poster.jpg')}>
      <source src={withBase('/hero-medihelpers.mp4')} type="video/mp4" />
    </video>}
  </>;
}
