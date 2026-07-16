import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import {
  Activity, Ambulance, ArrowLeft, ArrowRight, BadgeCheck, Banknote, BarChart3, BriefcaseBusiness, Building2,
  CalendarDays, Check, CircleCheck, ClipboardCheck, Clock3,
  CreditCard, Crown, FileCheck2, Heart, HeartPulse, LockKeyhole, Mail, MapPin, Menu, MessageCircle, Microscope, Phone, Pill,
  ScanLine, Search, ShieldCheck, Smile, Sparkles, Stethoscope, Target, TrendingUp, Upload, UserRound,
  UserRoundSearch, UsersRound, WalletCards, X
} from 'lucide-react';
import { adPlans, jobs, membershipPlans, navItems, talent } from './data.js';
import MatchingReportPage from './MatchingReportPage.jsx';
import AccountPage from './AccountPage.jsx';
import HeroSelect from './CustomSelect.jsx';
import QaPreviewPage from './QaPreviewPage.jsx';
import { getQaStateInfo, normalizeQaState, QA_PREVIEW_STORAGE_KEY } from './qaPreview.js';
import { getHospitalMood, hospitalMoodStyle, premiumBannerGuide } from './hospitalMood.js';
import {
  appendStoredRecord,
  readStoredArray,
  readStoredString,
  writeStoredString,
  writeStoredValue
} from './browserStorage.js';
import { appBase, withBase } from './basePath.js';
import { balancedOrder, orderPremium, countByDept } from './jobExposure.js';

const departments = ['전체 진료과', '내과', '정형외과', '소아청소년과', '가정의학과', '영상의학과', '마취통증의학과', '전문의'];
const regions = ['전국', '서울', '경기', '인천', '부산', '경남', '충북', '강원'];
const recruitmentTypes = ['전체 초빙', '봉직의', '원장·센터장', '검진·판독', '비임상·기업'];
const doctorConditions = ['전체 조건', '주 4일', '당직 협의', '숙소 지원', '검진 중심'];
function getRoute() {
  const pathname = appBase && window.location.pathname.startsWith(appBase) ? window.location.pathname.slice(appBase.length) || '/' : window.location.pathname;
  return `${pathname}${window.location.search}`;
}

function useRoute() {
  const [route, setRoute] = useState(getRoute);
  useEffect(() => {
    const onChange = () => setRoute(getRoute());
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);
  return route;
}

function getPerformanceProfile() {
  const queryMode = new URLSearchParams(window.location.search).get('motion');
  if (queryMode === 'full' || queryMode === 'lite') writeStoredString('medihelpers_motion', queryMode);
  const savedMode = readStoredString('medihelpers_motion');
  const forceFull = savedMode === 'full';
  const forceLite = savedMode === 'lite';
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowCpu = Number.isFinite(navigator.hardwareConcurrency) && navigator.hardwareConcurrency <= 4;
  const lowMemory = Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 4;
  const dataSaver = Boolean(connection?.saveData);
  const slowNetwork = /(^|-)2g$/.test(connection?.effectiveType || '');
  const reduced = forceLite || (!forceFull && (prefersReduced || lowCpu || lowMemory || dataSaver || slowNetwork));
  const reasons = [
    prefersReduced && '시스템 동작 줄이기',
    lowCpu && '저사양 CPU',
    lowMemory && '메모리 절약',
    dataSaver && '데이터 절약 모드',
    slowNetwork && '느린 네트워크'
  ].filter(Boolean);
  document.documentElement.classList.toggle('force-motion', forceFull);
  document.documentElement.classList.toggle('performance-lite', reduced);
  document.documentElement.dataset.performance = reduced ? 'lite' : 'full';
  return { reduced, reasons, forceFull };
}

function motionIsReduced() {
  return getPerformanceProfile().reduced;
}
getPerformanceProfile();

function useScrollMotion(route) {
  useLayoutEffect(() => {
    const reduced = motionIsReduced();
    if (reduced) return undefined;
    const selector = [
      '.page-hero-inner', '.section-head', '.quick-access', '.home-role-actions', '.member-teaser',
      '.job-card', '.profession-explorer', '.profession-focus', '.premium-showcase', '.path-card', '.step', '.price-card', '.membership-card',
      '.feature-grid > div', '.value-grid > div', '.community-grid > div', '.metrics-strip > div', '.ad-exposure-copy', '.exposure-rank-card',
      '.notice-bar', '.consultation-layout', '.contact-card', '.policy-card', '.conversion',
      '.matching-intro', '.report-picker', '.priority-panel', '.report-result', '.report-consult-card'
    ].join(',');
    const elements = [...document.querySelectorAll(selector)];
    document.documentElement.classList.add('motion-enabled');
    elements.forEach((element, index) => {
      element.classList.add('scroll-reveal');
      element.style.setProperty('--reveal-delay', `${(index % 4) * 65}ms`);
    });
    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -7% 0px' });
    elements.forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      elements.forEach((element) => {
        element.classList.remove('scroll-reveal', 'is-visible');
        element.style.removeProperty('--reveal-delay');
      });
    };
  }, [route]);

  useEffect(() => {
    const reduced = motionIsReduced();
    if (reduced) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(window.scrollY / max, 1);
      document.documentElement.style.setProperty('--scroll-progress', progress);
      const hero = document.querySelector('.home-hero');
      if (hero) {
        const distance = Math.min(window.scrollY, window.innerHeight);
        hero.style.setProperty('--hero-copy-shift', `${distance * 0.055}px`);
        hero.style.setProperty('--hero-card-shift', `${distance * -0.035}px`);
      }
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty('--scroll-progress');
    };
  }, [route]);
}

function navigate(path) {
  const reducedMotion = motionIsReduced();
  const commitNavigation = () => {
    if (getRoute() !== path) window.history.pushState({}, '', withBase(path));
    window.dispatchEvent(new PopStateEvent('popstate'));
    const navigation = new CustomEvent('medihelpers:navigate', { cancelable: true });
    window.dispatchEvent(navigation);
    if (!navigation.defaultPrevented) window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };
  const currentPage = document.querySelector('.route-stage');
  if (reducedMotion || !currentPage) return commitNavigation();
  currentPage.classList.add('route-leaving');
  window.setTimeout(commitNavigation, 170);
}

function useSmoothPageScroll() {
  useEffect(() => {
    const reducedMotion = motionIsReduced();
    const finePointer = window.matchMedia('(any-pointer: fine)').matches;
    if (reducedMotion || !finePointer) return undefined;
    const lenis = new Lenis({
      autoRaf: true,
      autoToggle: true,
      smoothWheel: true,
      syncTouch: false,
      duration: 0.9,
      wheelMultiplier: 0.92,
      anchors: { offset: -84, duration: 0.9 },
      stopInertiaOnNavigate: true
    });
    const onNavigate = (event) => {
      event.preventDefault();
      lenis.scrollTo(0, { immediate: true, force: true });
    };
    document.documentElement.classList.add('smooth-wheel-enabled');
    window.addEventListener('medihelpers:navigate', onNavigate);
    return () => {
      window.removeEventListener('medihelpers:navigate', onNavigate);
      document.documentElement.classList.remove('smooth-wheel-enabled');
      lenis.destroy();
    };
  }, []);
}

function trackConversion(event, detail = {}) {
  appendStoredRecord('medihelpers_conversion_events', {
    event,
    detail,
    path: getRoute(),
    createdAt: new Date().toISOString()
  }, 100);
}

function Link({ to, className = '', children, onClick, ...anchorProps }) {
  return <a {...anchorProps} href={withBase(to)} className={className} onClick={(event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onClick?.();
    navigate(to);
  }}>{children}</a>;
}

function Modal({ children, onClose, wide = false, label = '상세 정보', variant = '', accent = '' }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const closeTimerRef = useRef(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (closeTimerRef.current) return;
    if (motionIsReduced()) {
      onCloseRef.current();
      return;
    }
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => onCloseRef.current(), 240);
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const onKey = (event) => {
      if (event.key === 'Escape') return requestClose();
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.classList.add('modal-open');
    window.addEventListener('keydown', onKey);
    window.requestAnimationFrame(() => dialog?.focus());
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', onKey);
      previousFocus?.focus?.();
    };
  }, [requestClose]);

  return createPortal(<div className={`modal-backdrop ${closing ? 'is-closing' : ''}`} onPointerDown={(event) => event.target === event.currentTarget && requestClose()}>
    <div ref={dialogRef} className={`modal-card ${wide ? 'wide' : ''} ${variant}`} style={accent ? { '--modal-accent': accent } : undefined} role="dialog" aria-modal="true" aria-label={label} tabIndex="-1" data-lenis-prevent>
      <button className="modal-close" onClick={requestClose} aria-label="닫기"><X /></button>
      <div className="modal-scroll" data-lenis-prevent>{children}</div>
    </div>
  </div>, document.body);
}

function Header({ path, qa }) {
  const [open, setOpen] = useState(false);
  const accountLabel = qa.active ? qa.info.shortLabel : '로그인';
  const accountTarget = qa.active ? '/qa-preview' : '/signup';
  const primaryAction = qa.active && qa.info.capabilities.admin
    ? { label: '관리 콘솔', to: '/qa-preview' }
    : qa.active && qa.info.capabilities.hospital
      ? { label: '내 공고 관리', to: '/qa-preview' }
      : qa.active && qa.info.capabilities.membership
        ? { label: '멤버십 이용 중', to: '/membership' }
        : qa.active && qa.info.capabilities.doctor
          ? { label: '관심공고 보기', to: '/jobs' }
          : { label: '채용공고 등록', to: '/advertise' };
  return <header className="site-header">
    <div className="nav-wrap">
      <Link className="brand" to="/" onClick={() => setOpen(false)} aria-label="메디헬퍼스 홈">
        <img src={withBase('/medihelpers-logo.svg')} alt="메디헬퍼스" />
      </Link>
      <nav id="primary-navigation" className={open ? 'open' : ''}>
        {navItems.map((item) => <Link key={item.path} to={item.path} onClick={() => setOpen(false)} className={`${path === item.path ? 'active' : ''} ${item.path === '/advertise' ? 'nav-ad' : ''}`}>{item.label}</Link>)}
        <Link to={accountTarget} onClick={() => setOpen(false)} className={`mobile-account-link ${path === '/qa-preview' || path.startsWith('/signup') ? 'active' : ''}`}>{qa.active ? `QA · ${accountLabel}` : '로그인·회원가입'}</Link>
      </nav>
      <div className="nav-actions">
        <a className="text-link" href="tel:0513425463"><Phone size={16} /> 051-342-5463</a>
        <Link className={`header-account ${qa.active ? `qa-account tone-${qa.info.tone}` : ''}`} to={accountTarget}><UserRound size={16} /> {accountLabel}</Link>
        <Link className="button primary compact" to={primaryAction.to}>{primaryAction.label === '채용공고 등록' ? '의사 초빙공고 등록' : primaryAction.label}</Link>
      </div>
      <button className="menu-btn" onClick={() => setOpen(!open)} aria-label={open ? '메뉴 닫기' : '메뉴 열기'} aria-controls="primary-navigation" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
    </div>
  </header>;
}

function QaPreviewRibbon({ qa }) {
  if (!qa.active) return null;
  return <aside className={`qa-preview-ribbon tone-${qa.info.tone}`} aria-label="QA 미리보기 상태">
    <span><ShieldCheck /></span><div><small>QA 미리보기 · 실제 권한 아님</small><strong>{qa.info.label}</strong></div><Link to="/qa-preview">상태 변경</Link><button type="button" onClick={qa.exit}>종료</button>
  </aside>;
}

function Footer() {
  return <footer>
    <div className="footer-grid">
      <div className="footer-brand-block">
        <Link className="brand footer-logo" to="/"><img src={withBase('/medihelpers-logo.svg')} alt="메디헬퍼스" /></Link>
        <p>이직도 채용도 결국 사람의 일입니다.<br />메디헬퍼스가 직접 듣고, 꼼꼼히 연결하겠습니다.</p>
        <div className="footer-contact"><a href="tel:0513425463"><Phone size={15} /> 051-342-5463</a><a href="mailto:hr@medihelpers.co.kr"><Mail size={15} /> hr@medihelpers.co.kr</a></div>
      </div>
      <div className="footer-column"><strong>의사</strong><Link to="/jobs">초빙정보</Link><Link to="/headhunting">비공개 이직 상담</Link><Link to="/about">서비스 소개</Link></div>
      <div className="footer-column"><strong>병원</strong><Link to="/talent">의사 인재정보</Link><Link to="/headhunting">의사 채용 의뢰</Link><Link to="/advertise">광고센터</Link></div>
      <div className="footer-column"><strong>안내</strong><Link to="/signup">로그인·회원가입</Link><a href="mailto:hr@medihelpers.co.kr">문의하기</a><Link to="/about">개인정보 안내</Link><Link to="/about">이용약관</Link></div>
    </div>
    <div className="footer-bottom"><span>© 2026 MEDIHELPERS. All rights reserved.</span><span>부산광역시 북구 만덕대로 116번길 28</span></div>
  </footer>;
}

function PageHero({ eyebrow, title, description, children, tone = '' }) {
  return <section className={`page-hero ${tone}`}>
    <div className="page-hero-inner"><span className="eyebrow"><Sparkles size={15} /> {eyebrow}</span><h1>{title}</h1><p>{description}</p>{children}</div>
  </section>;
}

function HospitalLogo({ job, prominent = false, source, fit }) {
  const brandSource = source || job.banner || job.logo;
  const brandUrl = brandSource ? withBase(brandSource) : '';
  const brandFit = fit || job.brandFit || (job.banner ? 'banner' : 'mark');
  const hasBrandAsset = Boolean(brandSource || job.brandAsset);
  const mood = getHospitalMood(job);
  return <span className={`hospital-logo ${prominent ? 'prominent' : ''} ${hasBrandAsset ? 'has-image' : 'has-text'} logo-fit-${brandFit} ${job.brandAsset ? `brand-asset-${job.brandAsset}` : ''}`} style={{ '--logo-color': mood.primary }}>
    {job.brandAsset === 'bluecare' ? <span className="bluecare-brand" aria-label={`${job.hospital} 예시 로고`}><i className="bluecare-symbol"><b /><em /></i><span><strong>블루케어</strong><small>BLUECARE MEDICAL CENTER</small></span></span> : brandSource ? <img src={brandUrl} alt={`${job.hospital} ${brandFit === 'banner' ? '배너' : '로고'}`} loading="lazy" decoding="async" /> : <b>{job.logoText || job.hospital.slice(0, 2)}</b>}
  </span>;
}

const adPriority = { spotlight: 0, featured: 1, basic: 2 };
const prioritizeJobs = (items) => [...items].sort((a, b) => (adPriority[a.adTier] ?? 3) - (adPriority[b.adTier] ?? 3));

const advertisementPreviewJob = {
  id: 'advertisement-design-preview', hospital: '블루케어 메디컬센터', title: '전문의 의료진 집중채용',
  location: '서울 · 경기권', schedule: '주 4.5~5일', dept: '전문의', pay: '상담 후 협의',
  badge: '집중채용', adTier: 'spotlight', color: '#1263e8', brandAsset: 'bluecare',
  updated: '디자인 예시', facilityType: '가상 의료기관', focus: '광고 디자인 미리보기', scale: '디자인 예시',
  access: '실제 공고가 아닙니다.', summary: '병원 로고가 등록된 집중채용 광고의 노출 예시입니다.',
  benefits: ['대형 로고 노출', '최상단 우선 노출', '전담 컨설턴트']
};

function JobCard({ job, saved, onSave, onOpen, preview = false, qa, variant = '' }) {
  const isAd = Boolean(job.adTier);
  // 채용 목록에서는 장식 배너보다 병원 로고를 우선해 브랜드를 또렷하게 보여준다.
  const brandSource = job.logo || job.cardBanner || job.banner;
  const brandUrl = brandSource ? withBase(brandSource) : '';
  const brandFit = job.logo ? 'mark' : (job.cardBanner ? 'banner' : (job.brandFit || (job.banner ? 'banner' : 'mark')));
  const hasBrandAsset = Boolean(brandSource || job.brandAsset);
  const mood = getHospitalMood(job);
  const restricted = isAd || job.badge === '비공개';
  const qaUnlocked = restricted && qa?.active && qa.info.capabilities.privateDetails;
  const adLabel = job.adTier === 'spotlight' ? '집중채용 브랜드관' : '추천 브랜드관';
  const moveCardLight = (event) => {
    if (!isAd || event.pointerType === 'touch' || document.documentElement.classList.contains('performance-lite')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    event.currentTarget.style.setProperty('--pointer-x', `${x * 100}%`);
    event.currentTarget.style.setProperty('--pointer-y', `${y * 100}%`);
    event.currentTarget.style.setProperty('--tilt-x', `${(0.5 - y) * 1.8}deg`);
    event.currentTarget.style.setProperty('--tilt-y', `${(x - 0.5) * 1.8}deg`);
  };
  const resetCardLight = (event) => {
    event.currentTarget.style.setProperty('--tilt-x', '0deg');
    event.currentTarget.style.setProperty('--tilt-y', '0deg');
  };
  return <article className={`job-card ${variant ? `job-card-${variant}` : ''} ${preview ? 'advertisement-preview-card' : ''} ${isAd ? `premium-ad ad-${job.adTier} ${hasBrandAsset ? 'has-brand-logo' : 'has-brand-wordmark'} ${brandFit === 'banner' ? 'has-brand-banner' : ''}` : ''}`} style={isAd ? hospitalMoodStyle(job) : { '--job-color': job.color }} data-brand-mood={isAd ? mood.id : undefined} onPointerMove={moveCardLight} onPointerLeave={resetCardLight}>
    <button className="card-hit-area" onClick={onOpen} aria-label={preview ? '집중채용 광고 디자인 예시 신청하기' : `${job.hospital} ${job.title} 상세보기`} />
    <div className="job-top"><div><span className="tag" style={{ color: isAd ? mood.primary : job.color, background: `${isAd ? mood.primary : job.color}12` }}>{job.badge}</span>{isAd && <span className={job.isDemo ? 'sponsored-label demo-label' : 'sponsored-label'}>{job.isDemo ? 'DEMO · 가상 공고' : 'AD · 병원 브랜드 광고'}</span>}</div>{preview ? <span className="preview-card-label">SAMPLE</span> : <button className={saved ? 'heart saved' : 'heart'} onClick={(event) => { event.stopPropagation(); onSave(); }} aria-label="관심 공고 저장"><Heart size={20} fill={saved ? 'currentColor' : 'none'} /></button>}</div>
    {isAd ? <div className={`ad-brand-stage ${hasBrandAsset ? `logo-stage media-${brandFit}` : 'wordmark-stage'}`} style={brandSource ? { '--brand-image': `url(${brandUrl})` } : undefined}>
      <span className="ad-stage-label"><Sparkles size={14} /> {adLabel}</span>
      <span className="ad-stage-value">{job.adTier === 'spotlight' ? <><Crown /> 최상단 노출</> : <><BadgeCheck /> 맞춤 추천</>}</span>
      {hasBrandAsset ? <><span className="brand-media-backdrop" aria-hidden="true" /><HospitalLogo job={job} prominent source={brandSource} fit={brandFit} /><div className="ad-hospital-caption"><strong>{job.hospital}</strong><small>{job.logoDesignSample ? '광고 디자인 예시 · 공식 로고 아님' : '병원 브랜드 채용관'}</small></div></> : <div className="hospital-wordmark"><small>MEDICAL CAREER PARTNER</small><strong>{job.hospital}</strong><span><i /> 병원 브랜드 채용관</span></div>}
    </div> : <div className="job-hospital"><HospitalLogo job={job} /><span><strong>{job.hospital}</strong></span></div>}
    <h3>{job.title}</h3>
    <div className="meta"><span><MapPin size={15} />{job.location}</span><span><Clock3 size={15} />{job.schedule}</span></div>
    <div className="job-bottom"><span>{job.dept}</span><strong className={restricted && !qaUnlocked ? 'premium-value' : qaUnlocked ? 'qa-card-unlocked' : ''}>{restricted && !qaUnlocked ? <><LockKeyhole /> 멤버십 전용</> : qaUnlocked ? <><ShieldCheck /> {job.pay}</> : job.pay}</strong></div>
    <button className="card-action" onClick={(event) => { event.stopPropagation(); onOpen(); }}>{preview ? '이 디자인으로 광고하기' : '공고 자세히 보기'} <ArrowRight size={16} /></button>
  </article>;
}
function JobDetail({ job, saved, onSave, onClose, qa }) {
  const isAd = Boolean(job.adTier);
  const restricted = isAd || job.badge === '비공개';
  const qaUnlocked = restricted && qa?.active && qa.info.capabilities.privateDetails;
  const locked = restricted && !qaUnlocked;
  const mapUrl = `https://map.naver.com/p/search/${encodeURIComponent(`${job.hospital} ${job.location}`)}`;
  return <Modal onClose={onClose} wide variant="job-detail" accent={job.color} label={`${job.hospital} 채용공고 상세 정보`}>
    <div className="detail-heading" style={{ '--job-color': job.color }}><div className="detail-brand"><HospitalLogo job={job} prominent /><div><div className="detail-brand-label"><span className="tag" style={{ color: job.color, background: `${job.color}12` }}>{job.badge}</span>{isAd && <span>AD · 병원 브랜드 채용관</span>}{qaUnlocked && <span className="qa-unlocked-badge"><ShieldCheck /> QA 잠금 해제</span>}</div><strong>{job.hospital}</strong><small><BadgeCheck /> 등록된 기관 정보</small></div></div><h2>{job.title}</h2><div className="meta large"><span><MapPin size={17} />{job.location}</span><span><Clock3 size={17} />{job.schedule}</span><span><CalendarDays size={17} />{job.updated} 업데이트</span></div></div>
    <div className="detail-grid">
      <div className="detail-content"><section className="hospital-profile"><div className="detail-section-title"><span><Building2 /></span><div><small>HOSPITAL PROFILE</small><h3>병원 정보</h3></div></div><p>{job.summary}</p><dl className="hospital-facts"><div><dt>기관 유형</dt><dd>{job.facilityType}</dd></div><div><dt>기관 규모</dt><dd>{job.scale}</dd></div><div><dt>주요 진료</dt><dd>{job.focus}</dd></div><div><dt>채용 분야</dt><dd>{job.dept}</dd></div></dl></section><section className="location-panel"><div className="location-icon"><MapPin /></div><div><small>근무지 위치</small><strong>{job.location}</strong><p>{job.access}</p></div><a href={mapUrl} target="_blank" rel="noreferrer" aria-label={`${job.hospital} 지도에서 위치 보기`}>지도에서 보기 <ArrowRight /></a></section><section><div className="detail-section-title compact"><span><BriefcaseBusiness /></span><div><small>POSITION DETAILS</small><h3>포지션과 근무조건</h3></div></div><p>{job.summary}</p><div className="benefit-list">{job.benefits.map((item) => <span key={item}><Check size={15} />{item}</span>)}</div></section></div>
      <aside className={restricted ? `premium-aside ${qaUnlocked ? 'qa-unlocked' : ''}` : ''}>
        {locked ? <><span>예상 보수</span><div className="locked-value"><div className="free-preview"><small>무료 미리보기 완료</small><strong>지역 · 진료과 · 근무형태 확인</strong></div><div className="locked-list"><span><LockKeyhole /> 상세 급여와 인센티브</span><span><LockKeyhole /> 정확한 근무시간·당직</span><span><LockKeyhole /> 채용 담당자와 협의조건</span></div><Link className="button primary full" to={`/membership?type=doctor&job=${job.id}`} onClick={() => trackConversion('job_unlock_cta', { jobId: job.id, offer: 'single' })}>이 공고만 2,900원에 열람</Link><small className="value-hint">5건 이상 비교한다면 월 패스가 더 저렴해요.</small></div></> : <><span>{qaUnlocked ? 'QA 공개 상세조건' : '예상 보수'}</span><strong>{job.pay}</strong>{qaUnlocked && <div className="qa-unlocked-list"><span><Check /> 인센티브 별도 협의</span><span><Check /> 당직·근무시간 확인 가능</span><span><Check /> 담당 헤드헌터 연결 가능</span></div>}<small>경력과 진료 범위에 따라 조율합니다.</small><Link className="button primary full" to={`/headhunting?job=${job.id}`}>{qaUnlocked ? '헤드헌터와 조건 확인' : '비공개 상담 신청'}</Link></>}
        <button className="button outline full" onClick={onSave}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /> {saved ? '관심공고 저장됨' : '관심공고 저장'}</button>
      </aside>
    </div>
  </Modal>;
}

function ConsultationForm({ initialRole = 'doctor', initialContext = '', initialProfession = '', initialTopic = '' }) {
  const [role, setRole] = useState(initialRole);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(null);
  const professionName = initialProfession === 'doctor' ? '의사' : '';
  const [data, setData] = useState({ topic: initialTopic || (initialContext ? '특정 공고 문의' : ''), department: professionName, region: '', workType: '', message: '', name: '', phone: '', contactMethod: '전화', contactTime: '상관없음' });
  const topics = role === 'doctor' ? ['이직 가능성 확인', '비공개 포지션', '급여·근무조건 상담', '특정 공고 문의'] : ['채용공고 등록', '의사 추천', '급여·채용조건 설계', '긴급 채용'];
  const workTypes = role === 'doctor' ? ['주 4일', '주 4.5일', '주 5일', '협의 가능'] : ['정규직', '파트타임', '당직·대진', '협의 가능'];
  const update = (key, value) => setData((current) => ({ ...current, [key]: value }));
  const changeRole = (nextRole) => {
    setRole(nextRole);
    setStep(1);
    setData((current) => ({ ...current, topic: '', workType: '' }));
  };
  const submit = (event) => {
    event.preventDefault();
    const id = `MH-C-${String(Date.now()).slice(-6)}`;
    appendStoredRecord('medihelpers_consultations', { id, role, context: initialContext, profession: initialProfession, status: 'new', createdAt: new Date().toISOString(), ...data });
    trackConversion('consultation_submit', { role, topic: data.topic, context: initialContext });
    setSubmitted(id);
  };
  if (submitted) return <div className="consult-success"><span><CircleCheck /></span><small>상담번호 {submitted}</small><h3>상담 요청을 정확히 접수했습니다</h3><p>담당 헤드헌터가 내용을 먼저 검토한 뒤 선택하신 방식으로 연락드립니다.</p><div className="consult-next"><span><b>1</b>상담 접수</span><i /><span><b>2</b>내용 검토</span><i /><span><b>3</b>담당자 연락</span></div><a className="button outline" href="tel:0513425463"><Phone /> 급하면 전화로 문의</a></div>;
  return <form className="consult-form guided" onSubmit={submit}>
    <div className="guided-head"><div><small>간편 1:1 상담</small><h3>{role === 'doctor' ? '내 조건에 맞는 이직 상담' : '우리 병원에 맞는 채용 상담'}</h3></div><span>약 1~2분</span></div>
    <div className="consult-progress" aria-label={`상담 ${step}단계`}><div className={step >= 1 ? 'active' : ''}><b>1</b><span>상담 목적</span></div><i /><div className={step >= 2 ? 'active' : ''}><b>2</b><span>필수 조건</span></div><i /><div className={step >= 3 ? 'active' : ''}><b>3</b><span>연락 방법</span></div></div>
    {step === 1 && <div className="consult-step"><div className="role-tabs"><button type="button" className={role === 'doctor' ? 'active' : ''} onClick={() => changeRole('doctor')}><Stethoscope /> 의사</button><button type="button" className={role === 'hospital' ? 'active' : ''} onClick={() => changeRole('hospital')}><Building2 /> 병원</button></div><div className="step-question"><small>하나만 선택해주세요</small><h4>어떤 상담이 필요하신가요?</h4></div><div className="choice-grid">{topics.map((topic) => <button type="button" key={topic} className={data.topic === topic ? 'selected' : ''} onClick={() => update('topic', topic)}><span>{topic}</span>{data.topic === topic && <Check />}</button>)}</div><button type="button" className="button primary full" disabled={!data.topic} onClick={() => setStep(2)}>다음 · 필요한 조건 입력 <ArrowRight /></button></div>}
      {step === 2 && <div className="consult-step"><div className="step-question"><small>{data.topic}</small><h4>꼭 필요한 조건만 알려주세요</h4><p>정확하지 않아도 괜찮습니다. 담당자가 함께 정리해드려요.</p></div><div className="form-grid"><label><span>{role === 'doctor' ? '진료과·전문과목' : '채용 진료과·전문과목'} *</span><input value={data.department} onChange={(e) => update('department', e.target.value)} placeholder="예: 소화기내과, 정형외과 전문의" autoFocus /></label><label><span>{role === 'doctor' ? '희망 지역' : '병원 지역'}</span><input value={data.region} onChange={(e) => update('region', e.target.value)} placeholder="예: 부산·경남" /></label></div><div className="field-group"><span>{role === 'doctor' ? '희망 근무형태' : '채용 형태'}</span><div className="choice-row">{workTypes.map((item) => <button type="button" key={item} className={data.workType === item ? 'selected' : ''} onClick={() => update('workType', item)}>{item}</button>)}</div></div><label className="wide-field"><span>추가로 전하고 싶은 내용 <i>선택</i></span><textarea value={data.message} onChange={(e) => update('message', e.target.value)} rows="3" placeholder={role === 'doctor' ? '희망 보수나 피하고 싶은 조건을 적어주세요.' : '채용 일정이나 꼭 필요한 경력을 적어주세요.'} /></label><div className="step-actions"><button type="button" className="button outline" onClick={() => setStep(1)}><ArrowLeft /> 이전</button><button type="button" className="button primary" disabled={!data.department.trim()} onClick={() => setStep(3)}>다음 · 연락 방법 <ArrowRight /></button></div></div>}
    {step === 3 && <div className="consult-step"><div className="step-question"><small>마지막 단계</small><h4>어떻게 연락드리면 편하신가요?</h4></div><div className="form-grid"><label><span>{role === 'doctor' ? '성함' : '병원명'} *</span><input required value={data.name} onChange={(e) => update('name', e.target.value)} placeholder={role === 'doctor' ? '성함을 입력해주세요' : '병원명을 입력해주세요'} autoFocus /></label><label><span>연락처 *</span><input required value={data.phone} onChange={(e) => update('phone', e.target.value)} type="tel" placeholder="010-0000-0000" /></label></div><div className="contact-preference"><div><span>연락 방법</span><div className="choice-row">{['전화', '문자'].map((item) => <button type="button" key={item} className={data.contactMethod === item ? 'selected' : ''} onClick={() => update('contactMethod', item)}>{item}</button>)}</div></div><div><span>연락 시간</span><div className="choice-row">{['오전', '오후', '저녁', '상관없음'].map((item) => <button type="button" key={item} className={data.contactTime === item ? 'selected' : ''} onClick={() => update('contactTime', item)}>{item}</button>)}</div></div></div><div className="consult-summary"><small>상담 내용 확인</small><dl><div><dt>상담</dt><dd>{data.topic}</dd></div><div><dt>조건</dt><dd>{data.department}{data.region ? ` · ${data.region}` : ''}{data.workType ? ` · ${data.workType}` : ''}</dd></div><div><dt>연락</dt><dd>{data.contactMethod} · {data.contactTime}</dd></div></dl></div><label className="consent"><input type="checkbox" required name="privacy" value="agreed" /><span>상담을 위한 개인정보 수집·이용에 동의합니다. 입력 정보는 상담 목적으로만 사용됩니다.</span></label><div className="step-actions"><button type="button" className="button outline" onClick={() => setStep(2)}><ArrowLeft /> 이전</button><button className="button primary" type="submit">무료 상담 접수 <ArrowRight /></button></div><p className="form-note"><ShieldCheck /> 의사의 이직 의사와 상담 내용은 동의 없이 병원에 공개하지 않습니다.</p></div>}
  </form>;
}

function QuickAccess() {
  return <section className="home-role-actions" aria-label="의사와 병원 빠른 메뉴">
    <Link className="role-action doctor-action" to="/headhunting">
      <span className="role-action-icon"><MessageCircle /></span><div><small>의사 · 무료</small><strong>원하는 조건을 말하고 비공개 제안 받기</strong><p>이력서 공개 없이 의사 전담 헤드헌터와 1:1 상담</p></div><span className="role-arrow">이직 상담 <ArrowRight /></span>
    </Link>
    <Link className="role-action hospital-action" to="/advertise">
      <span className="role-action-icon"><Building2 /></span><div><small>병원 · 의사 채용</small><strong>의사 초빙공고 등록하기</strong><p>공고 검수와 의사 후보 상담까지 함께 지원</p></div><span className="role-arrow">59,000원부터 <ArrowRight /></span>
    </Link>
  </section>;
}

function MemberTeaser() {
  return <section className="member-teaser"><div className="member-icon"><Crown /></div><div><small>MEDIHELPERS DOCTOR MEMBERSHIP</small><h2>초빙정보 탐색은 무료, 상세 조건은 의사 멤버십으로</h2><p>의사는 프리미엄 초빙정보를, 병원은 검증된 의사 인재정보와 소개 요청권을 이용할 수 있습니다.</p></div><Link className="button dark" to="/membership">멤버십 비교 <ArrowRight /></Link></section>;
}

function MotionNotice() {
  const [profile, setProfile] = useState({ reduced: false, reasons: [] });
  useEffect(() => {
    const update = () => setProfile(getPerformanceProfile());
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    update();
    media.addEventListener?.('change', update);
    connection?.addEventListener?.('change', update);
    return () => {
      media.removeEventListener?.('change', update);
      connection?.removeEventListener?.('change', update);
    };
  }, []);
  if (!profile.reduced) return null;
  return <aside className="motion-notice"><Activity /><div><strong>경량 모드가 자동 적용되었습니다</strong><span>{profile.reasons.length ? profile.reasons.join(' · ') : '이 기기에서는 애니메이션을 줄여 더 빠르게 표시합니다.'}</span></div><button onClick={() => { writeStoredString('medihelpers_motion', 'full'); document.documentElement.classList.remove('performance-lite'); document.documentElement.classList.add('force-motion'); window.location.reload(); }}>효과 켜기</button></aside>;
}

function MediAngelAssistant() {
  const [open, setOpen] = useState(false);
  const assistantRef = useRef(null);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const closeOnOutsideClick = (event) => {
      if (open && assistantRef.current && !assistantRef.current.contains(event.target)) setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnOutsideClick);
    };
  }, [open]);

  const closeAssistant = () => setOpen(false);
  return <aside ref={assistantRef} className={`medi-angel-assistant ${open ? 'is-open' : ''}`} aria-label="메디헬퍼스 안내 도우미">
    {open && <section id="medi-angel-panel" className="medi-angel-panel" role="dialog" aria-modal="false" aria-labelledby="medi-angel-title">
      <div className="medi-angel-panel-head">
        <span><img src={withBase('/assets/medi-angel-assistant-v2.png')} alt="" /></span>
        <div><small>MEDIHELPERS GUIDE</small><strong id="medi-angel-title">안녕하세요, 메디예요</strong></div>
        <button type="button" aria-label="안내 도우미 닫기" onClick={closeAssistant}><X /></button>
      </div>
      <p>조건이 맞는 채용정보부터 전문 헤드헌터 상담까지 빠르게 안내해드릴게요.</p>
      <div className="medi-angel-actions">
        <Link to="/jobs" onClick={closeAssistant}><Search /><span><strong>의사 초빙공고 찾기</strong><small>초빙유형·진료과·지역별 검색</small></span><ArrowRight /></Link>
        <Link to="/matching-report" onClick={closeAssistant}><BarChart3 /><span><strong>매칭 리포트</strong><small>찜한 병원을 조건별 비교</small></span><ArrowRight /></Link>
        <Link to="/headhunting" onClick={closeAssistant}><UserRoundSearch /><span><strong>1:1 상담 요청</strong><small>전담 헤드헌터에게 바로 연결</small></span><ArrowRight /></Link>
      </div>
      <a className="medi-angel-phone" href="tel:0513425463"><Phone /><span><small>전화 상담</small><strong>051-342-5463</strong></span></a>
    </section>}
    {!open && <button type="button" className="medi-angel-nudge" onClick={() => setOpen(true)}><Sparkles /> 무엇을 도와드릴까요?</button>}
    <button type="button" className="medi-angel-toggle" aria-expanded={open} aria-controls="medi-angel-panel" aria-label={open ? '메디 도우미 닫기' : '메디 도우미 열기'} onClick={() => setOpen((value) => !value)}>
      <span className="medi-angel-sparkle"><Sparkles /></span>
      <img src={withBase('/assets/medi-angel-assistant-v2.png')} alt="메디헬퍼스 수호천사 메디" />
      <span className="medi-angel-status">상담 안내</span>
    </button>
  </aside>;
}
function HomePage() {
  const [recruitmentType, setRecruitmentType] = useState('전체 초빙');
  const [dept, setDept] = useState('전체 진료과');
  const [region, setRegion] = useState('전국');
  const [selectedJob, setSelectedJob] = useState(null);
  const search = () => navigate(`/jobs?recruitmentType=${encodeURIComponent(recruitmentType)}&dept=${encodeURIComponent(dept)}&region=${encodeURIComponent(region)}`);
  return <>
    <section className="home-hero">
      <div className="hero-copy"><span className="eyebrow"><Sparkles size={15} /> 의사 채용·이직 전문 헤드헌팅</span><h1>의사 이직,<br /><em>공고보다 조건을 먼저.</em></h1><p>진료과와 지역, 근무형태와 보수 조건을 기준으로<br />공개·비공개 초빙정보를 전담 헤드헌터가 직접 연결합니다.</p>
        <div className="hero-search-card" role="search" aria-label="의사 초빙정보 검색">
          <div className="hero-search-title"><span><Search /></span><div><strong>의사 초빙정보 바로 찾기</strong><small>초빙유형·진료과·지역을 선택하세요</small></div><em className="hero-search-badge">의사 전용</em></div>
          <div className="hero-search-fields">
            <label><small>초빙 유형</small><span><BriefcaseBusiness size={19} /><HeroSelect label="초빙 유형" value={recruitmentType} onChange={setRecruitmentType} options={recruitmentTypes} /></span></label>
            <label><small>진료과</small><span><Stethoscope size={19} /><HeroSelect label="진료과" value={dept} onChange={setDept} options={departments} /></span></label>
            <label><small>지역</small><span><MapPin size={19} /><HeroSelect label="지역" value={region} onChange={setRegion} options={regions} /></span></label>
            <button className="hero-search-button" onClick={search}>의사 초빙정보 보기 <ArrowRight /></button>
          </div>
          <div className="popular-searches"><span>많이 찾는 조건</span><Link to="/jobs?keyword=주%204일">주 4일</Link><Link to="/jobs?keyword=검진센터">검진센터</Link><Link to="/jobs?region=서울">서울</Link><Link to="/jobs?region=부산">부산</Link></div>
        </div>
        <div className="hero-assurance"><ShieldCheck /><span><strong>이직 의사는 상담 전까지 비공개</strong> · 초빙정보 탐색은 무료입니다</span></div>
      </div>
      <div className="concierge-card">
        <div className="concierge-head"><span><UserRoundSearch /></span><div><small>MEDIHELPERS CONCIERGE</small><strong>1:1 커리어 매칭</strong></div><i>LIVE</i></div>
        <div className="match-score"><div className="score-ring trust"><strong>3</strong><span>단계</span></div><div><small>메디헬퍼스 검수 기준</small><h3>많은 공고보다<br />확인된 조건을 먼저</h3></div></div>
        <div className="mini-position"><span className="mini-icon blue"><FileCheck2 /></span><div><small>STEP 01</small><strong>병원·담당자 확인</strong><p>연락 가능한 채용공고인지 확인</p></div><b>확인</b></div>
        <div className="mini-position"><span className="mini-icon mint"><ClipboardCheck /></span><div><small>STEP 02·03</small><strong>근무조건 확인·상담 연결</strong><p>모호한 조건은 담당자가 직접 확인</p></div><b>연결</b></div>
        <div className="concierge-foot"><CircleCheck size={16} /> 상담부터 조건 협상까지 함께합니다</div>
      </div>
    </section>
    <section className="section soft" id="featured-jobs"><div className="section-head"><div><span className="section-kicker">CURATED DOCTOR POSITIONS</span><h2>지금 주목할 의사 초빙</h2><p>진료과와 근무조건, 병원 정보를 확인한 포지션을 먼저 소개합니다.</p></div><Link className="button outline" to="/jobs">전체 초빙정보 보기 <ArrowRight size={17} /></Link></div><div className="job-grid">{prioritizeJobs(jobs).slice(0, 3).map((job) => <JobCard key={job.id} job={job} saved={false} onSave={() => {}} onOpen={() => setSelectedJob(job)} />)}</div></section>
    <QuickAccess />
    <MemberTeaser />
    {selectedJob && <JobDetail job={selectedJob} saved={false} onSave={() => {}} onClose={() => setSelectedJob(null)} />}
    <section className="dual-path section"><div className="path-card doctor"><span className="path-icon"><Stethoscope /></span><small>이직을 고민하는 의사라면</small><h2>내 조건을 먼저 말하고<br />비공개 제안을 받으세요</h2><p>이력서를 공개하지 않아도 의사 전담 헤드헌터가 적합한 병원을 찾아드립니다.</p><ul><li><Check /> 이직 의사 비공개</li><li><Check /> 보수·진료범위 협상</li><li><Check /> 퇴사·입사 일정 조율</li></ul><Link className="button dark" to="/headhunting">의사 이직 상담</Link></div><div className="path-card hospital"><span className="path-icon"><Building2 /></span><small>의사를 채용하는 병원이라면</small><h2>광고와 의사 추천을<br />한 번에 시작하세요</h2><p>초빙공고 등록부터 후보 발굴, 면접 일정까지 필요한 만큼 선택할 수 있습니다.</p><ul><li><Check /> 전문과목별 의사 인재풀</li><li><Check /> 의사 초빙공고 검수</li><li><Check /> 성과형 헤드헌팅</li></ul><Link className="button light" to="/advertise">의사 채용 시작</Link></div></section>
    <section className="section process"><div className="section-head centered"><div><span className="section-kicker">HOW IT WORKS</span><h2>사람이 끝까지 책임지는 매칭</h2><p>정보를 나열하는 데서 멈추지 않고 실제 결정까지 함께합니다.</p></div></div><div className="step-grid">{[[MessageCircle,'01','조건 상담','원하는 지역과 근무조건, 채용 일정을 듣습니다.'],[Target,'02','정밀 연결','공개·비공개 포지션과 검증된 인재를 선별합니다.'],[ClipboardCheck,'03','조건 조율','면접 일정과 보수, 근무조건 협상을 지원합니다.'],[CircleCheck,'04','새로운 시작','입사와 채용 완료 후에도 적응을 확인합니다.']].map(([Icon,n,t,d]) => <div className="step" key={n}><span>{n}</span><Icon /><h3>{t}</h3><p>{d}</p></div>)}</div></section>
    <ConversionBanner />
  </>;
}

// /professions 는 /headhunting 으로 통합되었습니다. SPA·GitHub Pages base 경로를 보존하며 대체 이동합니다.
function Redirect({ to }) {
  useEffect(() => {
    window.history.replaceState({}, '', withBase(to));
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [to]);
  return null;
}
const STANDARD_STEP = 9;
const PREMIUM_ROTATION_MS = 7000;

function getRecruitmentType(job) {
  const text = `${job.title} ${job.focus} ${job.facilityType}`;
  if (/기업|제약|Medical|비임상/i.test(text)) return '비임상·기업';
  if (/검진|판독|영상/.test(text)) return '검진·판독';
  if (/원장|과장|센터장/.test(text)) return '원장·센터장';
  return '봉직의';
}

function matchesDoctorCondition(job, condition) {
  if (condition === '전체 조건') return true;
  const text = `${job.title} ${job.summary} ${job.schedule} ${job.focus} ${job.benefits.join(' ')}`;
  if (condition === '주 4일') return /주 4일|주 4\.5일/.test(text);
  if (condition === '당직 협의') return /당직/.test(text);
  if (condition === '숙소 지원') return /숙소|기숙사/.test(text);
  if (condition === '검진 중심') return /검진|판독/.test(text);
  return true;
}

function matchesJob(job, { dept, region, keyword, recruitmentType = '전체 초빙', condition = '전체 조건' }) {
  const deptOk = dept === '전체 진료과' || job.dept === dept;
  const regionOk = region === '전국' || job.region === region;
  const recruitmentOk = recruitmentType === '전체 초빙' || getRecruitmentType(job) === recruitmentType;
  const conditionOk = matchesDoctorCondition(job, condition);
  const keywordOk = !keyword || `${job.hospital} ${job.title} ${job.summary} ${job.location} ${job.dept} ${job.type} ${job.schedule} ${job.pay} ${job.benefits.join(' ')}`.toLowerCase().includes(keyword.toLowerCase());
  return deptOk && regionOk && recruitmentOk && conditionOk && keywordOk;
}

function usePremiumSlotCount() {
  const [count, setCount] = useState(() => window.matchMedia('(max-width: 780px)').matches ? 1 : window.matchMedia('(max-width: 1180px)').matches ? 2 : 3);
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 780px)');
    const tablet = window.matchMedia('(max-width: 1180px)');
    const update = () => setCount(mobile.matches ? 1 : tablet.matches ? 2 : 3);
    update();
    mobile.addEventListener?.('change', update);
    tablet.addEventListener?.('change', update);
    return () => {
      mobile.removeEventListener?.('change', update);
      tablet.removeEventListener?.('change', update);
    };
  }, []);
  return count;
}

function PremiumAdCarousel({ items, renderCard }) {
  const rootRef = useRef(null);
  const slotCount = usePremiumSlotCount();
  const pageCount = Math.max(1, Math.ceil(items.length / slotCount));
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(!document.hidden);
  const [reducedMotion, setReducedMotion] = useState(() => motionIsReduced());

  useEffect(() => setPage(0), [items, slotCount]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const update = () => setReducedMotion(motionIsReduced());
    const onVisibility = () => setDocumentVisible(!document.hidden);
    update();
    document.addEventListener('visibilitychange', onVisibility);
    media.addEventListener?.('change', update);
    connection?.addEventListener?.('change', update);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      media.removeEventListener?.('change', update);
      connection?.removeEventListener?.('change', update);
    };
  }, []);
  useEffect(() => {
    if (!rootRef.current) return undefined;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (pageCount < 2 || paused || reducedMotion || !inView || !documentVisible) return undefined;
    const timer = window.setInterval(() => setPage((current) => (current + 1) % pageCount), PREMIUM_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [pageCount, paused, reducedMotion, inView, documentVisible]);

  const safePage = page % pageCount;
  const visible = items.slice(safePage * slotCount, safePage * slotCount + slotCount);
  const go = (next) => setPage((next + pageCount) % pageCount);
  const resumeAfterFocus = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
  };

  return <div className={`premium-rotator ${paused ? 'is-paused' : ''}`} ref={rootRef}
    onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)} onBlurCapture={resumeAfterFocus}>
    <div className="premium-rotation-toolbar">
      <span><i className="live-dot" /> {reducedMotion ? '수동 탐색' : paused ? '잠시 멈춤' : '자동 순환 중'}</span>
      {pageCount > 1 && <div className="premium-rotation-actions">
        <button type="button" onClick={() => go(safePage - 1)} aria-label="이전 프리미엄 광고"><ArrowLeft /></button>
        <strong><b>{safePage + 1}</b> / {pageCount}</strong>
        <button type="button" onClick={() => go(safePage + 1)} aria-label="다음 프리미엄 광고"><ArrowRight /></button>
      </div>}
    </div>
    <div key={`${safePage}-${slotCount}`} className={`job-grid promoted-grid premium-rotation-page ${visible.length === 1 ? 'single-item' : ''}`} aria-label={`프리미엄 광고 ${safePage + 1}번째 묶음`}>
      {visible.map(renderCard)}
    </div>
    {pageCount > 1 && <>
      <div className="premium-rotation-dots" role="group" aria-label="프리미엄 광고 묶음 선택">
        {Array.from({ length: pageCount }, (_, index) => <button key={index} type="button" className={index === safePage ? 'active' : ''} onClick={() => go(index)} aria-label={`${index + 1}번째 광고 묶음`} aria-current={index === safePage ? 'true' : undefined} />)}
      </div>
    </>}
  </div>;
}

function AdQuickLauncher({ onSelect }) {
  return <section className="jobs-ad-launcher" aria-labelledby="jobs-ad-launcher-title">
    <div className="jobs-ad-launcher-head">
      <span className="jobs-ad-launcher-icon"><Building2 /></span>
      <div><small>병원·의료기관 채용 담당자</small><h2 id="jobs-ad-launcher-title">상품을 한 번에 비교하고 등록하세요</h2><p>위 광고 구역의 빠른 등록 버튼을 이용하거나 여기에서 세 상품을 자세히 비교할 수 있습니다.</p></div>
      <Link to="/advertise">전체 상품 자세히 <ArrowRight /></Link>
    </div>
    <div className="jobs-ad-plan-grid">
      {adPlans.map((item) => <article className={['jobs-ad-plan', item.id].join(' ')} key={item.id}>
        <div className="jobs-ad-plan-top"><span>{item.id === 'basic' ? '기본 등록' : item.id === 'featured' ? '추천 노출' : '최상단 노출'}</span>{item.featured && <em>가장 많이 선택</em>}</div>
        <h3>{item.name}</h3>
        <p>{item.id === 'basic' ? '검색 목록에 빠르게 공고 등록' : item.id === 'featured' ? '병원 로고와 추천 카드 강조' : '브랜드 강조와 전담 채용 지원'}</p>
        <div className="jobs-ad-plan-action"><span><strong>{item.price.toLocaleString()}원</strong><small>/ {item.unit}</small></span><button type="button" onClick={() => { trackConversion('jobs_ad_quick_select', { planId: item.id }); onSelect(item); }}>{item.id === 'basic' ? '등록·결제하기' : '바로 결제하기'} <ArrowRight /></button></div>
      </article>)}
    </div>
    <p className="jobs-ad-payment-note"><ShieldCheck /> 실제 결제 전 공고 내용과 노출 기간·금액을 한 번 더 확인합니다.</p>
  </section>;
}

function SmartAdDock({ total, onSelect }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const scheduleReveal = (delay = 1450) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      setVisible(false);
      const nearFooter = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 280;
      if (nearFooter) return;
      timerRef.current = window.setTimeout(() => setVisible(true), delay);
    };
    const onScroll = () => scheduleReveal();
    scheduleReveal(2200);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (dismissed) return null;
  return <aside className={`smart-ad-dock ${visible ? 'is-visible' : ''}`} aria-label="병원 채용공고 등록 바로가기" aria-hidden={!visible}>
    <div className="smart-ad-dock-brand"><Building2 /><span><small>병원 채용 담당자</small><strong>의사 초빙공고를 등록하세요</strong></span></div>
    <div className="smart-ad-dock-count"><small>현재 초빙공고</small><strong>{total.toLocaleString()}</strong><span>건</span></div>
    <div className="smart-ad-dock-links"><Link to="/advertise">상품 안내</Link><Link to="/headhunting?role=hospital">채용 상담</Link></div>
    <button type="button" className="smart-ad-dock-cta" onClick={() => { trackConversion('smart_ad_dock_open'); onSelect(adPlans[0]); }}>초빙공고 등록하기 <ArrowRight /></button>
    <button type="button" className="smart-ad-dock-close" onClick={() => setDismissed(true)} aria-label="공고 등록창 닫기"><X /></button>
  </aside>;
}
function JobsPage({ route, qa }) {
  const params = new URLSearchParams(route.split('?')[1] || '');
  const [recruitmentType, setRecruitmentType] = useState(params.get('recruitmentType') || '전체 초빙');
  const [dept, setDept] = useState(params.get('dept') || '전체 진료과');
  const [region, setRegion] = useState(params.get('region') || '전국');
  const [condition, setCondition] = useState(params.get('condition') || '전체 조건');
  const [keyword, setKeyword] = useState(params.get('keyword') || '');
  const [saved, setSaved] = useState(() => readStoredArray('medihelpers_saved_jobs'));
  const [selected, setSelected] = useState(() => jobs.find((job) => job.id === params.get('open')) || null);
  const [adPlan, setAdPlan] = useState(null);
  const [standardVisible, setStandardVisible] = useState(STANDARD_STEP);
  const [jobSort, setJobSort] = useState('balanced');

  // 하루 동안 고정되는 결정적 회전 seed (UTC 일 단위). 세션당 한 번만 계산.
  const daySeed = useMemo(() => Math.floor(Date.now() / 86400000), []);
  const premiumSessionSeed = useMemo(() => daySeed + Math.floor(Math.random() * 1000000), [daySeed]);

  // 진료과 빠른 필터용: 진료과 필터 이전, 지역+키워드만 적용한 결과의 진료과별 개수.
  const specialtyStrip = useMemo(() => {
    const scoped = jobs.filter((job) => matchesJob(job, { dept: '전체 진료과', region, keyword, recruitmentType, condition }));
    const counts = Object.fromEntries(countByDept(scoped).map((item) => [item.key, item.count]));
    const items = [{ key: '전체 진료과', label: '전체', count: scoped.length }];
    departments.forEach((name) => {
      if (name === '전체 진료과') return;
      if (counts[name]) items.push({ key: name, label: name, count: counts[name] });
    });
    return items;
  }, [region, keyword, recruitmentType, condition]);

  const filtered = useMemo(() => jobs.filter((job) => matchesJob(job, { dept, region, keyword, recruitmentType, condition })), [dept, region, keyword, recruitmentType, condition]);
  // 프리미엄: 등급 우선순위 유지 + 등급 내부 진료과·지역 균형.
  const orderedPromoted = useMemo(() => orderPremium(filtered.filter((job) => job.adTier), { seed: premiumSessionSeed }), [filtered, premiumSessionSeed]);
  // 일반: 진료과·지역 라운드로빈 균형.
  const orderedStandard = useMemo(() => balancedOrder(filtered.filter((job) => !job.adTier), { seed: daySeed }), [filtered, daySeed]);
  const standardDisplayOrder = useMemo(() => jobSort === 'recent' ? filtered.filter((job) => !job.adTier) : orderedStandard, [filtered, orderedStandard, jobSort]);

  // 필터 변경 시 더보기 카운트 초기화.
  useEffect(() => {
    setStandardVisible(STANDARD_STEP);
  }, [dept, region, keyword, recruitmentType, condition]);

  const toggleSaved = (id) => setSaved((current) => {
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    writeStoredValue('medihelpers_saved_jobs', next);
    return next;
  });
  const resetFilters = () => {
    setRecruitmentType('전체 초빙');
    setDept('전체 진료과');
    setRegion('전국');
    setCondition('전체 조건');
    setKeyword('');
    setStandardVisible(STANDARD_STEP);
  };
  const renderPortalCard = (job) => <JobCard key={job.id} job={job} qa={qa} variant="compact" saved={saved.includes(job.id)} onSave={() => toggleSaved(job.id)} onOpen={() => { trackConversion('job_detail_open', { jobId: job.id }); setSelected(job); }} />;
  const renderStandardCard = (job) => <JobCard key={job.id} job={job} qa={qa} variant="compact" saved={saved.includes(job.id)} onSave={() => toggleSaved(job.id)} onOpen={() => { trackConversion('job_detail_open', { jobId: job.id }); setSelected(job); }} />;

  const visibleStandard = standardDisplayOrder.slice(0, standardVisible);
  const standardRemaining = standardDisplayOrder.length - visibleStandard.length;

  return <>
    <PageHero
      tone="jobs-hero"
      eyebrow="DOCTOR RECRUITMENT"
      title={<><span className="jobs-hero-part">조건부터 비교하는</span>{' '}<span className="jobs-hero-part">의사 초빙정보</span></>}
      description={<><span className="jobs-description-part">봉직의·원장·검진·비임상 포지션을</span>{' '}<span className="jobs-description-part">진료과와 지역, 근무조건으로 찾고</span>{' '}<span className="jobs-description-part">비공개 조건은 의사 전담 헤드헌터에게 확인하세요.</span></>}
    ><Link className="button outline" to="/headhunting">헤드헌팅 상담 <ArrowRight /></Link></PageHero>
    <nav className="job-hub-nav" aria-label="채용정보 메뉴"><div><strong className="job-hub-title">채용정보</strong><Link className="active" to="/jobs">전체 채용</Link><Link to="/talent">인재정보</Link><Link to="/headhunting">맞춤 초빙</Link><Link to="/matching-report?role=doctor">내 비교 리포트</Link><Link to="/account">내 활동</Link><Link className="job-hub-register" to="/advertise">공고 등록</Link></div></nav>
    <section className="section jobs-page"><div className="doctor-search-dock"><div className="doctor-search-title"><span><Search /> QUICK SEARCH</span><strong>원하는 의사 초빙조건을 한 번에 찾으세요</strong><button type="button" onClick={resetFilters}>조건 초기화</button></div><div className="filter-bar doctor-filter-bar"><label><BriefcaseBusiness /><HeroSelect label="초빙 유형 필터" value={recruitmentType} onChange={setRecruitmentType} options={recruitmentTypes} /></label><label><Stethoscope /><HeroSelect label="진료과 필터" value={dept} onChange={setDept} options={departments} /></label><label><MapPin /><HeroSelect label="지역 필터" value={region} onChange={setRegion} options={regions} /></label><label className="filter-keyword"><Search /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="병원명, 진료과, 근무조건 검색" /></label></div>
      <div className="doctor-condition-filter" role="group" aria-label="의사 초빙 상세조건">{doctorConditions.map((item) => <button key={item} type="button" className={condition === item ? 'active' : ''} aria-pressed={condition === item} onClick={() => setCondition(item)}>{item}</button>)}</div>
      </div><div className="specialty-strip" role="group" aria-label="진료과 빠른 필터">{specialtyStrip.map((item) => <button key={item.key} type="button" className={`specialty-chip ${dept === item.key ? 'active' : ''}`} aria-pressed={dept === item.key} onClick={() => setDept(item.key)}><span>{item.label}</span><b>{item.count}</b></button>)}</div>
      <div className="result-row portal-result-row"><div><small>검색 결과</small><strong><em>{filtered.length}</em>개의 의사 초빙공고</strong></div><div className="result-actions"><span><Heart size={15} /> 관심공고 {saved.length}개</span><button type="button" className={jobSort === 'balanced' ? 'active' : ''} onClick={() => setJobSort('balanced')}>추천순</button><button type="button" className={jobSort === 'recent' ? 'active' : ''} onClick={() => setJobSort('recent')}>최신순</button></div></div>
      {filtered.length ? <>
        {orderedPromoted.length > 0 && <div className="promoted-jobs portal-promoted-section"><div className="promotion-heading"><div><span><Crown /> PREMIUM DOCTOR RECRUITMENT</span><strong>먼저 확인할 플래티넘 초빙정보</strong></div><div className="tier-heading-actions"><small>병원 로고와 핵심 조건을 같은 규격으로 빠르게 비교하세요</small><button type="button" className="tier-apply-button spotlight" onClick={() => setAdPlan(adPlans[2])}>플래티넘 공고 등록 <ArrowRight /></button></div></div><div className="job-grid portal-premium-grid">{orderedPromoted.map(renderPortalCard)}</div></div>}
        <div className="balance-legend compact"><span className="balance-legend-icon"><Sparkles /></span><div><strong>진료과·지역 균형 노출</strong><p>광고 등급을 지키면서 같은 조건의 공고가 한쪽에 몰리지 않도록 고르게 배치합니다.</p></div></div>
        {orderedStandard.length > 0 && <div className="standard-jobs"><div className="standard-heading"><div><small>ACTIVE DOCTOR POSITIONS</small><strong>진행 중 의사 초빙공고</strong><span>진료과·지역 균형순 · {visibleStandard.length}/{orderedStandard.length}</span></div><button type="button" className="tier-apply-button basic" onClick={() => setAdPlan(adPlans[0])}>베이직 공고 올리기 <ArrowRight /></button></div><div className="job-grid standard-job-grid">{visibleStandard.map(renderStandardCard)}</div>{standardRemaining > 0 && <button type="button" className="standard-more" onClick={() => setStandardVisible((current) => current + STANDARD_STEP)}>공고 더보기 <em>남은 {standardRemaining}개</em> <ArrowRight size={16} /></button>}</div>}
        <div className="decision-nudge"><div><span><Crown /> MATCHING REPORT</span><h3>{saved.length ? `찜한 ${saved.length}개 병원, 조건별로 비교해보세요` : '관심 병원을 고르고 매칭 리포트를 만들어보세요'}</h3><p>근무·보수·거리·진료 범위를 비교하고 확인할 질문을 헤드헌터에게 그대로 전달합니다.</p></div><Link className="button dark" to="/matching-report?role=doctor" onClick={() => trackConversion('jobs_matching_report', { savedCount: saved.length })}>매칭 리포트 만들기 <ArrowRight /></Link></div>
      </> : <div className="empty-state"><Search /><h3>조건에 맞는 공고를 찾지 못했습니다</h3><p>검색 조건을 바꾸거나 헤드헌터에게 비공개 포지션을 문의해보세요.</p><button className="button primary" onClick={resetFilters}>검색 초기화</button></div>}
      <AdQuickLauncher onSelect={setAdPlan} />
    </section>
    <SmartAdDock total={jobs.length} onSelect={setAdPlan} />
    <ConversionBanner title="공개된 공고에 원하는 조건이 없나요?" description="등록되지 않은 비공개 포지션까지 함께 찾아드립니다." />
    {selected && <JobDetail job={selected} qa={qa} saved={saved.includes(selected.id)} onSave={() => toggleSaved(selected.id)} onClose={() => setSelected(null)} />}
    {adPlan && <Checkout plan={adPlan} onClose={() => setAdPlan(null)} />}
  </>;
}

function TalentPage() {
  const [dept, setDept] = useState('전체 진료과');
  const [region, setRegion] = useState('전국');
  const [availability, setAvailability] = useState('전체 시점');
  const [keyword, setKeyword] = useState('');
  const [talentSort, setTalentSort] = useState('recent');
  const [saved, setSaved] = useState(() => readStoredArray('medihelpers_saved_talent'));
  const talentRegions = ['전국', ...new Set(talent.flatMap((person) => person.region.split('·')))].filter(Boolean);
  const availableOptions = ['전체 시점', '즉시', '협의', '1개월 내', '2개월 내'];
  const visible = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    const filteredTalent = talent.filter((person) => {
      const matchesDept = dept === '전체 진료과' || person.dept === dept;
      const matchesRegion = region === '전국' || person.region.includes(region);
      const matchesAvailable = availability === '전체 시점' || person.available.includes(availability.replace(' 내', ''));
      const matchesKeyword = !query || [person.code, person.dept, person.career, person.region, person.preference, person.available].join(' ').toLowerCase().includes(query);
      return matchesDept && matchesRegion && matchesAvailable && matchesKeyword;
    });
    return talentSort === 'career' ? [...filteredTalent].sort((a, b) => Number.parseInt(b.career, 10) - Number.parseInt(a.career, 10)) : filteredTalent;
  }, [dept, region, availability, keyword, talentSort]);
  const toggleSaved = (code) => setSaved((current) => {
    const next = current.includes(code) ? current.filter((item) => item !== code) : [...current, code];
    writeStoredValue('medihelpers_saved_talent', next);
    return next;
  });
  return <>
    <PageHero tone="mint talent-hero" eyebrow="VERIFIED DOCTOR TALENT" title="조건으로 찾는 익명 의사 인재정보" description="전문과·경력·희망 지역·입사 가능 시점을 먼저 비교하고, 의사의 동의가 확인된 뒤 필요한 정보만 안전하게 연결합니다."><Link className="button primary" to="/headhunting?role=hospital">우리 병원 의사 추천받기</Link></PageHero>
    <nav className="job-hub-nav talent-hub-nav" aria-label="인재정보 메뉴"><div><strong className="job-hub-title">인재정보</strong><Link to="/jobs">채용정보</Link><Link className="active" to="/talent">전체 인재</Link><Link to="/headhunting?role=hospital">맞춤 인재 추천</Link><Link to="/matching-report?role=hospital">후보 비교</Link><Link to="/account">인재 관리</Link><Link className="job-hub-register" to="/headhunting?role=hospital">채용 의뢰</Link></div></nav>
    <section className="section talent-page"><div className="talent-search-dock"><div className="doctor-search-title"><span><UserRoundSearch /> TALENT SEARCH</span><strong>필요한 진료과와 근무조건으로 인재를 찾으세요</strong><button type="button" onClick={() => { setDept('전체 진료과'); setRegion('전국'); setAvailability('전체 시점'); setKeyword(''); }}>조건 초기화</button></div><div className="talent-filter-grid"><label><span>진료과</span><HeroSelect label="의사 진료과 필터" value={dept} onChange={setDept} options={departments.slice(0, -2)} /></label><label><span>희망 지역</span><HeroSelect label="의사 희망 지역 필터" value={region} onChange={setRegion} options={talentRegions} /></label><label><span>입사 가능</span><HeroSelect label="의사 입사 가능 시점 필터" value={availability} onChange={setAvailability} options={availableOptions} /></label><label className="talent-keyword"><span>키워드</span><div><Search /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="진료과, 경력, 희망 조건 검색" /></div></label></div></div><div className="notice-bar talent-privacy-notice"><ShieldCheck /><div><strong>안전한 익명 의사정보</strong><p>목록에서는 비교에 필요한 조건만 공개합니다. 근무기관 이력과 개인 식별정보는 후보자의 동의와 병원 확인 절차 이후에 전달합니다.</p></div></div><div className="result-row portal-result-row"><div><small>전체 인재정보</small><strong>총 <em>{visible.length}</em>명의 상담 완료 의사</strong></div><div className="result-actions"><span><Heart size={15} /> 관심 인재 {saved.length}명</span><button type="button" className={talentSort === 'recent' ? 'active' : ''} onClick={() => setTalentSort('recent')}>최근 상담순</button><button type="button" className={talentSort === 'career' ? 'active' : ''} onClick={() => setTalentSort('career')}>경력순</button></div></div><div className="talent-grid talent-portal-list">{visible.map((person) => <article className="talent-card" key={person.code}><div className="talent-top"><span className="avatar"><UserRound /></span><div><small>{person.code}</small><h3>{person.dept} · {person.career}</h3></div><BadgeCheck /><button className={`talent-save ${saved.includes(person.code) ? 'saved' : ''}`} onClick={() => toggleSaved(person.code)} aria-label={`${person.code} 의사 후보 찜하기`}><Heart fill={saved.includes(person.code) ? 'currentColor' : 'none'} /></button></div><dl><div><dt>희망 지역</dt><dd>{person.region}</dd></div><div><dt>희망 조건</dt><dd>{person.preference}</dd></div><div><dt>입사 가능</dt><dd>{person.available}</dd></div></dl><div className="talent-lock-preview"><span><LockKeyhole /> 동의 후 공개되는 상세정보</span><p>근무기관 이력 · 세부 술기 · 이직 사유 · 컨설턴트 확인 메모</p></div><Link className="button outline full" to={`/membership?type=hospital&candidate=${person.code}`} onClick={() => trackConversion('talent_intro_cta', { candidate: person.code })}>이 의사 소개 요청 · 39,000원</Link></article>)}</div>{!visible.length && <div className="empty-state"><UserRoundSearch /><h3>조건에 맞는 인재를 찾지 못했습니다</h3><p>검색 조건을 바꾸거나 전담 컨설턴트에게 비공개 인재 추천을 요청해보세요.</p></div>}<div className="decision-nudge report-nudge"><div><span><BarChart3 /> MATCHING REPORT</span><h3>{saved.length ? `찜한 ${saved.length}명 의사, 채용조건과 비교해보세요` : '관심 의사를 찜하고 적합 조건을 비교해보세요'}</h3><p>전문과목·경력·희망 지역·입사 시점을 비교하고 확인 질문을 헤드헌터에게 전달합니다.</p></div><Link className="button dark" to="/matching-report?role=hospital">의사 매칭 리포트 <ArrowRight /></Link></div></section>
    <section className="section soft"><div className="feature-grid"><div><UserRoundSearch /><h3>조건 기반 후보 탐색</h3><p>진료과뿐 아니라 지역, 근무형태, 입사 가능 시점까지 확인합니다.</p></div><div><FileCheck2 /><h3>경력·자격 사전 확인</h3><p>후보자가 제공한 경력과 자격 정보를 소개 전에 점검합니다.</p></div><div><ShieldCheck /><h3>동의 기반 정보 공개</h3><p>양측의 의사를 확인한 뒤 필요한 범위의 정보만 전달합니다.</p></div></div></section>
    <ConversionBanner title="찾는 인재가 따로 있으신가요?" description="채용 조건을 남기면 공개되지 않은 인재풀까지 확인해드립니다." hospital />
  </>;
}

function HeadhuntingPage({ route }) {
  const params = new URLSearchParams(route.split('?')[1] || '');
  const role = params.get('role') === 'hospital' ? 'hospital' : 'doctor';
  const context = params.get('job') || params.get('candidate') || '';
  const profession = params.get('profession') || '';
  return <>
    <PageHero
      tone="dark headhunting-hero"
      eyebrow="PRIVATE CONSULTING"
      title={<><span className="headhunting-title-line">이직과 채용,</span><span className="headhunting-title-line"><span>공개하기 전에</span>{' '}<span>먼저 상담하세요</span></span></>}
      description={<><span className="headhunting-description-part">의료 채용 현장을 아는</span>{' '}<span className="headhunting-description-part">전담 헤드헌터가</span>{' '}<span className="headhunting-description-part">조건 정리부터 면접과 협상까지</span>{' '}<span className="headhunting-description-part">한 사람처럼 함께합니다.</span></>}
    />
    <section className="section consultation-layout"><div className="consult-copy"><span className="section-kicker">1:1 DOCTOR HEADHUNTING</span><h2>공고보다 먼저,<br />의사의 상황을 듣습니다</h2><p>같은 진료과라도 원하는 진료 방식과 삶의 조건은 다릅니다. 메디헬퍼스는 보수만 맞추지 않고 오래 만족할 수 있는 병원과 의사를 연결합니다.</p><div className="consult-points"><div><span><Phone /></span><div><strong>빠른 첫 연락</strong><p>접수 내용을 확인하고 가능한 시간에 연락드립니다.</p></div></div><div><span><ShieldCheck /></span><div><strong>철저한 비공개</strong><p>동의 전에는 이직 의사와 병원 내부정보를 공개하지 않습니다.</p></div></div><div><span><TrendingUp /></span><div><strong>실제 조건 협상</strong><p>보수, 진료 범위, 당직과 입사 일정을 구체적으로 조율합니다.</p></div></div></div><div className="direct-contact"><small>바로 상담하고 싶다면</small><a href="tel:0513425463">051-342-5463</a><span>평일 09:00–18:00</span></div></div><ConsultationForm key={`${role}-${context}-${profession}`} initialRole={role} initialContext={context} initialProfession={profession} /></section>
    <section className="section soft"><div className="section-head centered"><div><span className="section-kicker">TWO-SIDED DOCTOR HEADHUNTING</span><h2>의사와 병원, 서로 다른 고민을 해결합니다</h2></div></div><div className="compare-grid"><div><Stethoscope /><h3>의사에게</h3><ul><li><Check /> 공개하지 않고 이직 가능성 확인</li><li><Check /> 비공개 포지션과 실제 근무조건 안내</li><li><Check /> 보수·진료범위·스케줄 협상 지원</li><li><Check /> 퇴사와 입사 일정 조율</li></ul></div><div><Building2 /><h3>병원에게</h3><ul><li><Check /> 의사 초빙조건과 공고 문구 개선</li><li><Check /> 익명 의사 인재풀 후보 발굴</li><li><Check /> 면접 일정과 후보 피드백 관리</li><li><Check /> 광고 또는 성공보수 방식 선택</li></ul></div></div></section>
  </>;
}

function Checkout({ plan, onClose }) {
  const [done, setDone] = useState(false);
  const [method, setMethod] = useState('card');
  const [facilityType, setFacilityType] = useState('');
  const [facilityError, setFacilityError] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [logoName, setLogoName] = useState('');
  const [logoError, setLogoError] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');
  const [bannerName, setBannerName] = useState('');
  const [bannerError, setBannerError] = useState('');
  useEffect(() => () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
  }, [logoPreview, bannerPreview]);
  const selectLogo = (event) => {
    const file = event.target.files?.[0];
    setLogoError('');
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      event.target.value = '';
      setLogoName('');
      setLogoError('5MB 이하 파일을 선택해주세요.');
      return;
    }
    setLogoName(file.name);
    setLogoPreview(URL.createObjectURL(file));
  };
  const selectBanner = (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setBannerError('');
    if (!file) return;
    if (file.size > premiumBannerGuide.maxBytes) {
      input.value = '';
      setBannerName('');
      setBannerError('8MB 이하 파일을 선택해주세요.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const ratio = image.naturalWidth / image.naturalHeight;
      if (ratio < premiumBannerGuide.minRatio || ratio > premiumBannerGuide.maxRatio) {
        input.value = '';
        setBannerName('');
        setBannerError('가로 3:1 비율의 배너를 사용해주세요. 권장 1500×500px');
        URL.revokeObjectURL(previewUrl);
        return;
      }
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      setBannerName(file.name);
      setBannerPreview(previewUrl);
    };
    image.onerror = () => {
      input.value = '';
      setBannerName('');
      setBannerError('이미지 파일을 확인해주세요.');
      URL.revokeObjectURL(previewUrl);
    };
    image.src = previewUrl;
  };
  const submit = (event) => {
    event.preventDefault();
    if (!facilityType) {
      setFacilityError('기관 유형을 선택해주세요.');
      return;
    }
    const formData = new FormData(event.currentTarget);
    const logo = formData.get('logo');
    const banner = formData.get('banner');
    formData.delete('logo');
    formData.delete('banner');
    const data = { ...Object.fromEntries(formData.entries()), logoName: logo instanceof File && logo.size ? logo.name : '', bannerName: banner instanceof File && banner.size ? banner.name : '', premiumBrandMode: banner instanceof File && banner.size ? 'hospital-banner' : 'auto-wordmark' };
    appendStoredRecord('medihelpers_ad_requests', { id: `AD-${Date.now()}`, planId: plan.id, amount: plan.price, paymentMethod: method, status: 'payment-link-requested', createdAt: new Date().toISOString(), ...data });
    setDone(true);
  };
  return <Modal onClose={onClose} wide label="의사 초빙광고 상품 신청">{done ? <div className="checkout-success"><span><CircleCheck /></span><h2>광고 결제 요청이 접수되었습니다</h2><p>초빙공고 내용과 병원 브랜드 정보를 확인한 뒤 결제 안내를 보내드립니다.<br />PG 연동 전까지는 이 단계에서 실제 금액이 청구되지 않습니다.</p><button className="button primary" onClick={onClose}>확인</button></div> : <><div className="checkout-title"><small>DOCTOR RECRUITMENT AD</small><h2>의사 초빙광고 신청</h2><p>병원 브랜드와 의사 초빙정보를 함께 검수한 뒤 결제 링크와 게시 일정을 안내합니다.</p></div><form className="checkout-grid" onSubmit={submit}><div className="checkout-form"><div className="brand-banner-upload"><div className="banner-preview">{bannerPreview ? <img src={bannerPreview} alt="선택한 프리미엄 병원 배너 미리보기" /> : <div><Sparkles /><strong>배너가 없으면 자동 브랜드 배너</strong><small>병원명과 진료 성격에 맞는 절제된 색상으로 제작합니다.</small></div>}</div><label><span>프리미엄 병원 배너 <i>선택</i></span><input name="banner" type="file" accept="image/png,image/jpeg,image/webp" onChange={selectBanner} /><div className="upload-button"><Upload /><div><strong>{bannerName || '3:1 배너 파일 선택'}</strong><small>권장 1500×500px · PNG·JPG·WEBP · 최대 8MB</small></div></div>{bannerError && <em>{bannerError}</em>}</label></div><div className="brand-upload"><div className="logo-preview">{logoPreview ? <img src={logoPreview} alt="선택한 병원 로고 미리보기" /> : <Building2 />}</div><label><span>병원 로고 <i>선택 · 권장</i></span><input name="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={selectLogo} /><div className="upload-button"><Upload /><div><strong>{logoName || '로고 파일 선택'}</strong><small>PNG·JPG·WEBP, 최대 5MB</small></div></div>{logoError && <em>{logoError}</em>}</label></div><div className="form-grid"><label><span>병원명 *</span><input required name="hospital" placeholder="병원명을 입력해주세요" /></label><label><span>기관 유형 *</span><HeroSelect label="기관 유형" name="facilityType" value={facilityType} onChange={(next) => { setFacilityType(next); setFacilityError(''); }} options={[{ value: '', label: '기관 유형 선택' }, '종합병원', '병원', '요양병원', '한방병원', '의원', '검진·전문센터', '기타 의료기관']} className="form-custom-select" />{facilityError && <em className="field-error">{facilityError}</em>}</label><label><span>담당자명 *</span><input required name="manager" placeholder="담당자 성함" /></label><label><span>연락처 *</span><input required name="phone" type="tel" placeholder="010-0000-0000" /></label><label><span>이메일 *</span><input required name="email" type="email" placeholder="billing@hospital.co.kr" /></label><label><span>병원 위치 *</span><input required name="address" placeholder="예: 부산광역시 연제구" /></label></div><label className="wide-field"><span>채용 진료과·초빙 형태 *</span><input required name="department" placeholder="예: 정형외과 전문의, 검진센터 진료원장" /></label><label className="wide-field"><span>병원·초빙 소개 <i>선택</i></span><textarea name="introduction" rows="3" placeholder="진료 환경, 기관의 강점, 초빙 인원과 일정을 간단히 적어주세요." /></label><div className="payment-choice"><span>결제 안내 방식</span><div><button type="button" className={method === 'card' ? 'active' : ''} onClick={() => setMethod('card')}><CreditCard /> 카드 결제 링크</button><button type="button" className={method === 'transfer' ? 'active' : ''} onClick={() => setMethod('transfer')}><Banknote /> 계좌이체·세금계산서</button></div></div><label className="consent"><input required type="checkbox" name="terms" value="agreed" /><span>광고 검수, 결제 안내 및 개인정보 수집·이용에 동의합니다. 병원 로고는 사용 권한을 확인한 파일만 등록합니다.</span></label></div><aside className="order-summary"><small>선택한 상품</small><h3>{plan.name}</h3><p>{plan.unit} 노출</p><ul>{plan.features.map((item) => <li key={item}><Check />{item}</li>)}</ul><div className="price-row"><span>결제 예정금액<small>부가세 포함</small></span><strong>{plan.price.toLocaleString()}원</strong></div><button className="button primary full" type="submit">결제 안내 요청하기 <ArrowRight size={17} /></button><p className="secure-note"><ShieldCheck /> 실제 결제는 공고 검수 후 진행됩니다.</p></aside></form></>}</Modal>;
}

function AdvertisePage() {
  const [plan, setPlan] = useState(null);
  return <>
    <PageHero tone="ad" eyebrow="DOCTOR RECRUITMENT AD CENTER" title="좋은 의사에게 먼저 닿는 초빙광고" description="초기 파트너 가격 59,000원부터 시작합니다. 의사 초빙공고 등록부터 전담 컨설턴트의 후보 발굴까지 필요한 만큼 선택하세요."><a className="button light" href="#plans">광고 상품 비교</a></PageHero>
    <section className="section ad-exposure-pitch">
      <div className="ad-exposure-copy">
        <span className="section-kicker">BE SEEN FIRST</span>
        <h2>좋은 공고도<br />먼저 보이지 않으면 놓칩니다</h2>
        <p>집중채용과 추천 광고는 일반공고보다 먼저 배치되고, 병원 로고와 채용 분야를 더 크게 보여줍니다.</p>
        <div className="ad-exposure-actions">
          <button className="button primary" onClick={() => setPlan(adPlans[1])}>추천 광고 시작하기 <ArrowRight /></button>
          <a className="text-cta" href="#ad-preview">실제 노출 예시 보기 <ArrowRight /></a>
        </div>
      </div>
      <div className="exposure-rank-card" aria-label="광고 상품별 노출 순서 예시">
        <div className="exposure-rank-head"><span><Crown /> 채용정보 목록 노출 순서</span><small>디자인 예시</small></div>
        <div className="exposure-row spotlight"><b>01</b><span className="exposure-mark"><Sparkles /></span><div><small>집중채용</small><strong>최상단 브랜드 강조 카드</strong></div><em>가장 먼저</em></div>
        <div className="exposure-row featured"><b>02</b><span className="exposure-mark"><TrendingUp /></span><div><small>추천 광고</small><strong>추천 영역 강조 노출</strong></div><em>우선 노출</em></div>
        <div className="exposure-row basic"><b>03</b><span className="exposure-mark"><FileCheck2 /></span><div><small>일반공고</small><strong>최신 등록순 기본 노출</strong></div><em>기본</em></div>
        <p className="exposure-note"><ShieldCheck /> 실제 노출 위치와 기간은 결제 전에 확인합니다.</p>
      </div>
    </section>
    <section className="section ad-preview-section" id="ad-preview"><div className="ad-preview-copy"><span className="section-kicker">LIVE LIST CARD PREVIEW</span><h2>병원 로고가 먼저 보이는<br />초빙공고 카드</h2><p>의사가 목록을 훑는 순간 병원을 알아볼 수 있도록 로고·워드마크를 카드의 중심에 두고, 공고 제목과 핵심 조건은 아래에 정돈합니다.</p><ul><li><Check /> 흰색 로고 보드로 병원 브랜드를 또렷하게 노출</li><li><Check /> 공고 제목·지역·근무조건을 빠르게 비교</li><li><Check /> 목록 최상단 우선 배치와 전담 컨설턴트 연결</li></ul><button className="button primary" onClick={() => setPlan(adPlans[2])}>집중채용 광고 신청 <ArrowRight /></button></div><div className="ad-preview-frame"><span className="preview-disclaimer"><ShieldCheck /> 디자인 예시 · 실제 공고 아님</span><div className="preview-list-heading"><span><Crown /> PREMIUM PLACEMENT</span><strong>먼저 보는 집중채용</strong><small>채용정보 실제 노출 카드</small></div><JobCard job={advertisementPreviewJob} saved={false} onSave={() => {}} onOpen={() => setPlan(adPlans[2])} preview /></div></section>
    <section className="section soft" id="plans"><div className="section-head centered"><div><span className="section-kicker">EARLY PARTNER PRICE</span><h2>인지도 대신 가격과 직접지원으로 시작합니다</h2><p>초기 파트너에게 부담이 적은 가격을 적용하고, 실제 결제 전 담당자가 기간과 조건을 다시 확인합니다.</p></div></div><div className="pricing-grid">{adPlans.map((item) => <article className={`price-card ${item.featured ? 'featured' : ''}`} key={item.id}>{item.featured && <span className="popular">추천</span>}<small>{item.label}</small><h3>{item.name}</h3><p>{item.description}</p><div className="price"><strong>{item.price.toLocaleString()}</strong><span>원 / {item.unit}</span></div><ul>{item.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul><button className={`button ${item.featured ? 'primary' : 'outline'} full`} onClick={() => setPlan(item)}>이 상품 신청하기</button></article>)}</div><div className="price-principle"><ShieldCheck /><div><strong>숨은 비용 없이 먼저 확인합니다</strong><p>게시기간, 노출 위치, 수정 지원 범위와 최종 결제금액을 담당자가 확인한 뒤 결제를 진행합니다. 초기 가격은 운영 데이터와 서비스 범위에 따라 변경될 수 있으며 결제 전에 안내합니다.</p></div></div><div className="headhunt-plan"><div><span><UsersRound /></span><div><small>SUCCESS-BASED RECRUITING</small><h3>공고만으로 어려운 채용은 전담 헤드헌팅</h3><p>필요한 진료과와 조건을 바탕으로 후보 발굴부터 협상까지 맡아드립니다.</p></div></div><Link className="button dark" to="/headhunting?role=hospital">별도 견적 상담</Link></div></section>
    <section className="section"><div className="section-head centered"><div><span className="section-kicker">ORDER PROCESS</span><h2>결제보다 먼저 공고를 검수합니다</h2></div></div><div className="step-grid three">{[[FileCheck2,'01','상품·공고 접수','병원과 채용 정보를 입력합니다.'],[WalletCards,'02','결제 및 검수','금액과 게시 조건 확인 후 결제합니다.'],[TrendingUp,'03','게시·성과 확인','공고를 게시하고 상담·지원 반응을 확인합니다.']].map(([Icon,n,t,d]) => <div className="step" key={n}><span>{n}</span><Icon /><h3>{t}</h3><p>{d}</p></div>)}</div><div className="legal-note"><ShieldCheck /><p><strong>안전한 광고 운영</strong><br />공고는 메디헬퍼스의 검수 후 게시됩니다. 의료법 및 채용 관련 법령에 위반되거나 사실 확인이 어려운 표현은 수정 요청 또는 게시 거절될 수 있습니다.</p></div></section>
    {plan && <Checkout plan={plan} onClose={() => setPlan(null)} />}
  </>;
}

function MembershipCheckout({ plan, onClose }) {
  const [done, setDone] = useState(false);
  const submit = (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    appendStoredRecord('medihelpers_membership_requests', { id: `MEM-${Date.now()}`, planId: plan.id, amount: plan.price, status: 'payment-link-requested', createdAt: new Date().toISOString(), ...data });
    trackConversion('checkout_request', { planId: plan.id, amount: plan.price });
    setDone(true);
  };
  return <Modal onClose={onClose}>{done ? <div className="checkout-success"><span><CircleCheck /></span><h2>멤버십 결제 요청이 접수되었습니다</h2><p>회원 유형과 자격을 확인한 뒤 안전한 결제 링크를 보내드립니다.<br />현재는 실제 금액이 청구되지 않습니다.</p><button className="button primary" onClick={onClose}>확인</button></div> : <div className="membership-checkout"><small>MEMBERSHIP ORDER</small><h2>{plan.name}</h2><p>{plan.description}</p><div className="membership-price"><strong>{plan.price.toLocaleString()}원</strong><span>/ {plan.period}</span></div><form onSubmit={submit}><label><span>{plan.audience === 'doctor' ? '의사 성함' : '병원명'} *</span><input required name="name" /></label><label><span>연락처 *</span><input required name="phone" type="tel" placeholder="010-0000-0000" /></label><label><span>이메일 *</span><input required name="email" type="email" /></label><label className="consent"><input required type="checkbox" name="terms" value="agreed" /><span>회원 자격 확인, 결제 안내 및 개인정보 수집·이용에 동의합니다.</span></label><button className="button primary full" type="submit">결제 안내 요청하기 <ArrowRight /></button></form><p className="secure-note"><ShieldCheck /> 자격 확인 후 권한이 활성화됩니다.</p></div>}</Modal>;
}

function ValueCalculator({ type, onChoose }) {
  const [count, setCount] = useState(type === 'doctor' ? 3 : 2);
  const single = membershipPlans.find((plan) => plan.id === `${type}-single`);
  const pass = membershipPlans.find((plan) => plan.id === `${type}-pass`);
  const singleTotal = single.price * count;
  const usePass = pass.price < singleTotal;
  const recommended = usePass ? pass : single;
  return <div className="value-calculator"><div><small>나에게 맞는 이용권 계산</small><h3>{type === 'doctor' ? '이번 달에 몇 개 공고를 자세히 볼까요?' : '이번 달에 몇 명을 소개받을까요?'}</h3><p>이용 예상량에 따라 더 경제적인 상품을 바로 비교합니다.</p></div><div className="calculator-control"><strong>{count}<span>{type === 'doctor' ? '개 공고' : '명 후보'}</span></strong><input aria-label="예상 이용량" type="range" min="1" max={type === 'doctor' ? 10 : 6} value={count} onChange={(event) => setCount(Number(event.target.value))} /></div><div className="calculator-result"><span>{usePass ? '월 패스가 더 경제적이에요' : '건별 이용권이 부담이 적어요'}</span><strong>{recommended.name}</strong><p>건별 이용 시 {singleTotal.toLocaleString()}원 · 추천 상품 {recommended.price.toLocaleString()}원</p><button className="button primary" onClick={() => { trackConversion('calculator_recommendation', { type, count, planId: recommended.id }); onChoose(recommended); }}>추천 이용권 선택</button></div></div>;
}

function MembershipPage({ route, qa }) {
  const params = new URLSearchParams(route.split('?')[1] || '');
  const [type, setType] = useState(params.get('type') === 'hospital' ? 'hospital' : 'doctor');
  const [selected, setSelected] = useState(null);
  const plans = membershipPlans.filter((plan) => plan.audience === type);
  const contextId = params.get('job') || params.get('candidate');
  const contextType = params.get('candidate') ? 'hospital' : params.get('job') ? 'doctor' : null;
  const contextPlan = membershipPlans.find((plan) => plan.id === `${type}-single`);
  const qaMemberActive = qa?.active && qa.info.capabilities.membership && type === 'doctor';
  return <>
    <PageHero tone="membership" eyebrow="EARLY ACCESS PRICE" title="필요한 핵심정보만, 2,900원부터" description="기본 검색과 상담은 무료로 시작하고, 실제 결정에 필요한 검증 정보만 건별 열람권 또는 초기 멤버십 가격으로 이용합니다." />
    {qaMemberActive && <section className="qa-membership-active"><span><Crown /></span><div><small>QA SUBSCRIPTION ACTIVE</small><strong>의사 월 패스 이용 중</strong><p>상세 급여·근무시간·당직·협의조건이 열린 상태입니다. 다음 가상 결제일 2026.08.16</p></div><Link to="/qa-preview">테스트 상태 변경 <ArrowRight /></Link></section>}
    <section className="section membership-section"><div className="membership-tabs"><button className={type === 'doctor' ? 'active' : ''} onClick={() => setType('doctor')}><Stethoscope /> 의사용</button><button className={type === 'hospital' ? 'active' : ''} onClick={() => setType('hospital')}><Building2 /> 병원용</button></div>{contextId && <div className="context-offer"><div><span><CircleCheck /> 무료 미리보기 확인 완료</span><h3>{type === 'doctor' ? '선택한 공고의 핵심조건만 바로 열어보세요' : '선택한 의사 후보의 검증정보와 소개를 요청하세요'}</h3><p>{type === 'doctor' ? '상세 급여·당직·협의조건을 한 번에 확인합니다.' : '의사 동의 확인부터 첫 인터뷰 연결까지 지원합니다.'}</p></div><button className="button primary" onClick={() => { trackConversion('context_single_offer', { type, contextId }); setSelected(contextPlan); }}>{contextPlan.price.toLocaleString()}원으로 계속</button></div>}<div className="access-explain"><div><span className="access-number">FREE</span><h3>무료로 충분히 비교</h3><p>{type === 'doctor' ? '진료과, 지역, 기본 근무형태와 공개 공고' : '진료과, 경력 연차, 희망 지역과 입사 가능 시점'}</p></div><ArrowRight /><div className="paid-access"><span className="access-number">UNLOCK</span><h3>결정할 때만 결제</h3><p>{type === 'doctor' ? '상세 급여, 정확한 근무시간, 비공개 병원 및 포지션' : '검증 경력, 세부 술기, 동의 기반 소개 요청'}</p></div></div><ValueCalculator key={type} type={type} onChoose={setSelected} /><div className="membership-grid">{plans.map((plan) => <article className={`membership-card ${plan.featured ? 'featured' : ''}`} key={plan.id}>{plan.featured && <span className="popular">추천</span>}<small>{plan.period === '월' ? 'MONTHLY PASS' : 'ONE-TIME ACCESS'}</small><h2>{plan.name}</h2><p>{plan.description}</p><div className="price"><strong>{plan.price.toLocaleString()}</strong><span>원 / {plan.period}</span></div><ul>{plan.features.map((feature) => <li key={feature}><Check /> {feature}</li>)}</ul><button className={`button ${plan.featured ? 'primary' : 'outline'} full`} onClick={() => { trackConversion('membership_plan_select', { planId: plan.id }); setSelected(plan); }}>이용권 신청</button></article>)}</div><div className="privacy-gate"><ShieldCheck /><div><strong>결제해도 의사 개인정보를 바로 판매하지 않습니다</strong><p>병원은 검증된 익명 정보를 열람하고 소개를 요청합니다. 의사의 명시적 동의가 확인된 뒤에만 필요한 범위의 정보가 전달됩니다.</p></div></div></section>
    {selected && <MembershipCheckout plan={selected} onClose={() => setSelected(null)} />}
  </>;
}

function AboutPage() {
  return <>
    <PageHero tone="about" eyebrow="ABOUT MEDIHELPERS" title="의사 채용을 사람답게 만드는 연결" description="메디헬퍼스는 병원과 의사의 조건만 맞추지 않습니다. 서로 오래 신뢰할 수 있는 선택을 만들기 위해 의사 전담 헤드헌터가 직접 듣고 확인하고 조율합니다." />
    <section className="section story-layout"><div><span className="section-kicker">WHY MEDIHELPERS</span><h2>초빙공고 너머의<br />진짜 사정을 이해합니다</h2></div><div><p>의사의 이직은 생활과 가족, 진료 철학까지 함께 움직이는 결정입니다. 병원의 의사 채용 역시 단순히 빈자리를 채우는 일이 아니라 환자와 조직의 미래를 정하는 일입니다.</p><p>그래서 메디헬퍼스는 거대한 익명 게시판 대신, 의사 전담 헤드헌터가 양측의 이야기를 직접 듣고 필요한 정보만 안전하게 연결하는 방식을 선택했습니다.</p></div></section>
    <section className="section soft"><div className="value-grid"><div><span>01</span><ShieldCheck /><h3>신뢰를 먼저</h3><p>개인정보와 내부정보를 함부로 공개하지 않고 동의를 기준으로 움직입니다.</p></div><div><span>02</span><UserRoundSearch /><h3>사람이 직접</h3><p>자동 추천만으로 끝내지 않고 담당자가 조건과 맥락을 확인합니다.</p></div><div><span>03</span><Target /><h3>좋은 결과까지</h3><p>소개 건수보다 만족스러운 입사와 채용 완료를 목표로 합니다.</p></div></div></section>
    <section className="section contact-section"><div className="contact-card"><span className="section-kicker">CONTACT</span><h2>어떤 고민부터 이야기할까요?</h2><p>이직을 아직 결정하지 않았거나 의사 채용 조건이 정리되지 않았어도 괜찮습니다.</p><div><a href="tel:0513425463"><Phone /> <span><small>전화 상담</small><strong>051-342-5463</strong></span></a><a href="mailto:hr@medihelpers.co.kr"><Mail /> <span><small>이메일</small><strong>hr@medihelpers.co.kr</strong></span></a></div></div><div className="policy-card"><h3>개인정보와 서비스 운영 원칙</h3><ul><li>상담 정보는 요청한 상담과 매칭 목적으로만 사용합니다.</li><li>의사 프로필은 본인 동의 없이 병원에 공개하지 않습니다.</li><li>병원 초빙정보는 사실 확인과 표현 검수 후 게시합니다.</li><li>광고비와 헤드헌팅 비용은 계약·결제 전에 명확히 안내합니다.</li></ul><p>정식 회원 기능과 결제 도입 전에 이용약관, 개인정보처리방침, 환불정책을 법률 검토 후 별도 게시합니다.</p></div></section>
    <ConversionBanner />
  </>;
}

function NotFoundPage() {
  return <section className="not-found"><span>404</span><h1>페이지를 찾을 수 없습니다</h1><p>주소가 바뀌었거나 아직 준비되지 않은 페이지입니다.</p><Link className="button primary" to="/"><ArrowLeft /> 홈으로 돌아가기</Link></section>;
}

function ConversionBanner({ title = '좋은 연결을 찾고 계신가요?', description = '이직과 채용, 어느 쪽이든 전담 헤드헌터가 먼저 듣겠습니다.', hospital = false }) {
  return <section className="conversion"><div><small>MEDIHELPERS CONCIERGE</small><h2>{title}</h2><p>{description}</p></div><div><a className="button light" href="tel:0513425463"><Phone size={17} /> 전화 상담</a><Link className="button glass" to={hospital ? '/headhunting?role=hospital' : '/headhunting'}>무료 상담 신청 <ArrowRight size={17} /></Link></div></section>;
}

export function App() {
  const route = useRoute();
  const path = route.split('?')[0].replace(/\/$/, '') || '/';
  const [qaState, setQaState] = useState(() => normalizeQaState(readStoredString(QA_PREVIEW_STORAGE_KEY)));
  useSmoothPageScroll();
  useScrollMotion(route);

  const selectQaState = useCallback((nextState) => {
    const normalized = normalizeQaState(nextState) || 'guest';
    setQaState(normalized);
    writeStoredString(QA_PREVIEW_STORAGE_KEY, normalized);
  }, []);
  const exitQaPreview = useCallback(() => {
    setQaState('');
    writeStoredString(QA_PREVIEW_STORAGE_KEY, '');
    navigate('/');
  }, []);
  useEffect(() => {
    if (path === '/qa-preview' && !qaState) selectQaState('guest');
  }, [path, qaState, selectQaState]);

  const qaActive = path === '/qa-preview' || Boolean(qaState);
  const qaInfo = getQaStateInfo(qaState);
  const qa = useMemo(() => ({ active: qaActive, state: qaState || 'guest', info: qaInfo, select: selectQaState, exit: exitQaPreview }), [qaActive, qaState, qaInfo, selectQaState, exitQaPreview]);
  const mobileAction = qa.active && (qa.info.capabilities.admin || qa.info.capabilities.hospital)
    ? { to: '/qa-preview', label: qa.info.capabilities.admin ? '관리 콘솔' : '내 공고 관리' }
    : { to: '/advertise', label: '공고 등록' };

  let page;
  if (path === '/') page = <HomePage />;
  else if (path === '/jobs') page = <JobsPage route={route} qa={qa} />;
  else if (path === '/professions') page = <Redirect to="/headhunting" />;
  else if (path === '/talent') page = <TalentPage />;
  else if (path === '/matching-report') page = <MatchingReportPage route={route} jobs={jobs} talent={talent} onNavigate={navigate} />;
  else if (path === '/headhunting') page = <HeadhuntingPage route={route} />;
  else if (path === '/advertise') page = <AdvertisePage />;
  else if (path === '/membership') page = <MembershipPage route={route} qa={qa} />;
  else if (path === '/qa-preview') page = <QaPreviewPage qa={qa} />;
  else if (path === '/signup/doctor') page = <AccountPage memberType="doctor" />;
  else if (path === '/signup/hospital') page = <AccountPage memberType="hospital" />;
  else if (path === '/signup' || path === '/account') page = <AccountPage />;
  else if (path === '/about') page = <AboutPage />;
  else page = <NotFoundPage />;
  return <div className={`app ${qa.active ? 'qa-preview-active' : ''}`}><div className="scroll-progress" aria-hidden="true" /><Header path={path} qa={qa} /><QaPreviewRibbon qa={qa} /><main key={route} className="route-stage">{page}</main><Footer /><MediAngelAssistant /><MotionNotice /><div className="mobile-quickbar"><Link to="/jobs"><Search />채용 찾기</Link><Link className="mobile-ad" to={mobileAction.to}><Building2 />{mobileAction.label}</Link></div></div>;
}
