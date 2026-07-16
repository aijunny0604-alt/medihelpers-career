import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import {
  Activity, Ambulance, ArrowLeft, ArrowRight, BadgeCheck, Banknote, BarChart3, BriefcaseBusiness, Building2,
  CalendarDays, Check, ChevronDown, CircleCheck, ClipboardCheck, Clock3,
  CreditCard, Crown, FileCheck2, Heart, HeartPulse, LockKeyhole, Mail, MapPin, Menu, MessageCircle, Microscope, Phone, Pill,
  ScanLine, Search, ShieldCheck, Smile, Sparkles, Stethoscope, Target, TrendingUp, Upload, UserRound,
  UserRoundSearch, UsersRound, WalletCards, X
} from 'lucide-react';
import { adPlans, jobs, membershipPlans, navItems, professions, talent } from './data.js';
import MatchingReportPage from './MatchingReportPage.jsx';
import AccountPage from './AccountPage.jsx';
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

function motionIsReduced() {
  if (new URLSearchParams(window.location.search).get('motion') === 'full') writeStoredString('medihelpers_motion', 'full');
  const forced = readStoredString('medihelpers_motion') === 'full';
  document.documentElement.classList.toggle('force-motion', forced);
  return !forced && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
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
  const commitNavigation = () => {
    if (getRoute() !== path) window.history.pushState({}, '', withBase(path));
    window.dispatchEvent(new PopStateEvent('popstate'));
    const navigation = new CustomEvent('medihelpers:navigate', { cancelable: true });
    window.dispatchEvent(navigation);
    if (!navigation.defaultPrevented) window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const reducedMotion = motionIsReduced();
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

function Modal({ children, onClose, wide = false, label = '상세 정보' }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const onKey = (event) => {
      if (event.key === 'Escape') return onClose();
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
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', onKey);
      previousFocus?.focus?.();
    };
  }, [onClose]);
  return createPortal(<div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div ref={dialogRef} className={`modal-card ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={label} tabIndex="-1" data-lenis-prevent>
      <button className="modal-close" onClick={onClose} aria-label="닫기"><X /></button>
      <div className="modal-scroll" data-lenis-prevent>{children}</div>
    </div>
  </div>, document.body);
}

function Header({ path }) {
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <div className="nav-wrap">
      <Link className="brand" to="/" onClick={() => setOpen(false)} aria-label="메디헬퍼스 홈">
        <img src={withBase('/medihelpers-logo.svg')} alt="메디헬퍼스" />
      </Link>
      <nav id="primary-navigation" className={open ? 'open' : ''}>
        {navItems.map((item) => <Link key={item.path} to={item.path} onClick={() => setOpen(false)} className={`${path === item.path ? 'active' : ''} ${item.path === '/advertise' ? 'nav-ad' : ''}`}>{item.label}</Link>)}
        <Link to="/signup" onClick={() => setOpen(false)} className={`mobile-account-link ${path.startsWith('/signup') ? 'active' : ''}`}>로그인·회원가입</Link>
      </nav>
      <div className="nav-actions">
        <a className="text-link" href="tel:0513425463"><Phone size={16} /> 051-342-5463</a>
        <Link className="header-account" to="/signup"><UserRound size={16} /> 로그인</Link>
        <Link className="button primary compact" to="/advertise">채용공고 등록</Link>
      </div>
      <button className="menu-btn" onClick={() => setOpen(!open)} aria-label={open ? '메뉴 닫기' : '메뉴 열기'} aria-controls="primary-navigation" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
    </div>
  </header>;
}

function Footer() {
  return <footer>
    <div className="footer-grid">
      <div className="footer-brand-block">
        <Link className="brand footer-logo" to="/"><img src={withBase('/medihelpers-logo.svg')} alt="메디헬퍼스" /></Link>
        <p>이직도 채용도 결국 사람의 일입니다.<br />메디헬퍼스가 직접 듣고, 꼼꼼히 연결하겠습니다.</p>
        <div className="footer-contact"><a href="tel:0513425463"><Phone size={15} /> 051-342-5463</a><a href="mailto:hr@medihelpers.co.kr"><Mail size={15} /> hr@medihelpers.co.kr</a></div>
      </div>
      <div className="footer-column"><strong>의료인</strong><Link to="/jobs">채용정보</Link><Link to="/headhunting">구직 상담</Link><Link to="/about">서비스 소개</Link></div>
      <div className="footer-column"><strong>의료기관</strong><Link to="/talent">인재정보</Link><Link to="/headhunting">채용 의뢰</Link><Link to="/advertise">광고센터</Link></div>
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
  return <span className={`hospital-logo ${prominent ? 'prominent' : ''} ${hasBrandAsset ? 'has-image' : 'has-text'} logo-fit-${brandFit} ${job.brandAsset ? `brand-asset-${job.brandAsset}` : ''}`} style={{ '--logo-color': job.color }}>
    {job.brandAsset === 'bluecare' ? <span className="bluecare-brand" aria-label={`${job.hospital} 예시 로고`}><i className="bluecare-symbol"><b /><em /></i><span><strong>블루케어</strong><small>BLUECARE MEDICAL CENTER</small></span></span> : brandSource ? <img src={brandUrl} alt={`${job.hospital} ${brandFit === 'banner' ? '배너' : '로고'}`} /> : <b>{job.logoText || job.hospital.slice(0, 2)}</b>}
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

function JobCard({ job, saved, onSave, onOpen, preview = false }) {
  const isAd = Boolean(job.adTier);
  const brandSource = job.cardBanner || job.banner || job.logo;
  const brandUrl = brandSource ? withBase(brandSource) : '';
  const brandFit = job.cardBanner ? 'banner' : (job.brandFit || (job.banner ? 'banner' : 'mark'));
  const hasBrandAsset = Boolean(brandSource || job.brandAsset);
  const restricted = isAd || job.badge === '비공개';
  const adLabel = job.adTier === 'spotlight' ? '집중채용 브랜드관' : '추천 브랜드관';
  const moveCardLight = (event) => {
    if (!isAd || event.pointerType === 'touch') return;
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
  return <article className={`job-card ${preview ? 'advertisement-preview-card' : ''} ${isAd ? `premium-ad ad-${job.adTier} ${hasBrandAsset ? 'has-brand-logo' : 'has-brand-wordmark'}` : ''}`} style={{ '--job-color': job.color }} onPointerMove={moveCardLight} onPointerLeave={resetCardLight}>
    <button className="card-hit-area" onClick={onOpen} aria-label={preview ? '집중채용 광고 디자인 예시 신청하기' : `${job.hospital} ${job.title} 상세보기`} />
    <div className="job-top"><div><span className="tag" style={{ color: job.color, background: `${job.color}12` }}>{job.badge}</span>{isAd && <span className="sponsored-label">AD · 병원 브랜드 광고</span>}</div>{preview ? <span className="preview-card-label">SAMPLE</span> : <button className={saved ? 'heart saved' : 'heart'} onClick={(event) => { event.stopPropagation(); onSave(); }} aria-label="관심 공고 저장"><Heart size={20} fill={saved ? 'currentColor' : 'none'} /></button>}</div>
    {isAd ? <div className={`ad-brand-stage ${hasBrandAsset ? `logo-stage media-${brandFit}` : 'wordmark-stage'}`} style={brandSource ? { '--brand-image': `url(${brandUrl})` } : undefined}>
      <span className="ad-stage-label"><Sparkles size={14} /> {adLabel}</span>
      {hasBrandAsset ? <><span className="brand-media-backdrop" aria-hidden="true" /><HospitalLogo job={job} prominent source={brandSource} fit={brandFit} /><div className="ad-hospital-caption"><strong>{job.hospital}</strong><small>{job.logoDesignSample ? '광고 디자인 예시 · 공식 로고 아님' : '병원 브랜드 채용관'}</small></div></> : <div className="hospital-wordmark"><small>MEDICAL CAREER PARTNER</small><strong>{job.hospital}</strong><span><i /> 병원 브랜드 채용관</span></div>}
    </div> : <div className="job-hospital"><HospitalLogo job={job} /><span><strong>{job.hospital}</strong></span></div>}
    <h3>{job.title}</h3>
    <div className="meta"><span><MapPin size={15} />{job.location}</span><span><Clock3 size={15} />{job.schedule}</span></div>
    <div className="job-bottom"><span>{job.dept}</span><strong className={restricted ? 'premium-value' : ''}>{restricted ? <><LockKeyhole /> 멤버십 전용</> : job.pay}</strong></div>
    <button className="card-action" onClick={(event) => { event.stopPropagation(); onOpen(); }}>{preview ? '이 디자인으로 광고하기' : '공고 자세히 보기'} <ArrowRight size={16} /></button>
  </article>;
}
function JobDetail({ job, saved, onSave, onClose }) {
  const isAd = Boolean(job.adTier);
  const restricted = isAd || job.badge === '비공개';
  const mapUrl = `https://map.naver.com/p/search/${encodeURIComponent(`${job.hospital} ${job.location}`)}`;
  return <Modal onClose={onClose} wide>
    <div className="detail-heading" style={{ '--job-color': job.color }}><div className="detail-brand"><HospitalLogo job={job} prominent /><div><div className="detail-brand-label"><span className="tag" style={{ color: job.color, background: `${job.color}12` }}>{job.badge}</span>{isAd && <span>AD · 병원 브랜드 채용관</span>}</div><strong>{job.hospital}</strong><small><BadgeCheck /> 등록된 기관 정보</small></div></div><h2>{job.title}</h2><div className="meta large"><span><MapPin size={17} />{job.location}</span><span><Clock3 size={17} />{job.schedule}</span><span><CalendarDays size={17} />{job.updated} 업데이트</span></div></div>
    <div className="detail-grid">
      <div className="detail-content"><section className="hospital-profile"><div className="detail-section-title"><span><Building2 /></span><div><small>HOSPITAL PROFILE</small><h3>병원 정보</h3></div></div><p>{job.summary}</p><dl className="hospital-facts"><div><dt>기관 유형</dt><dd>{job.facilityType}</dd></div><div><dt>기관 규모</dt><dd>{job.scale}</dd></div><div><dt>주요 진료</dt><dd>{job.focus}</dd></div><div><dt>채용 분야</dt><dd>{job.dept}</dd></div></dl></section><section className="location-panel"><div className="location-icon"><MapPin /></div><div><small>근무지 위치</small><strong>{job.location}</strong><p>{job.access}</p></div><a href={mapUrl} target="_blank" rel="noreferrer" aria-label={`${job.hospital} 지도에서 위치 보기`}>지도에서 보기 <ArrowRight /></a></section><section><div className="detail-section-title compact"><span><BriefcaseBusiness /></span><div><small>POSITION DETAILS</small><h3>포지션과 근무조건</h3></div></div><p>{job.summary}</p><div className="benefit-list">{job.benefits.map((item) => <span key={item}><Check size={15} />{item}</span>)}</div></section></div>
      <aside className={restricted ? 'premium-aside' : ''}><span>예상 보수</span>{restricted ? <div className="locked-value"><div className="free-preview"><small>무료 미리보기 완료</small><strong>지역 · 진료과 · 근무형태 확인</strong></div><div className="locked-list"><span><LockKeyhole /> 상세 급여와 인센티브</span><span><LockKeyhole /> 정확한 근무시간·당직</span><span><LockKeyhole /> 채용 담당자와 협의조건</span></div><Link className="button primary full" to={`/membership?type=doctor&job=${job.id}`} onClick={() => trackConversion('job_unlock_cta', { jobId: job.id, offer: 'single' })}>이 공고만 2,900원에 열람</Link><small className="value-hint">5건 이상 비교한다면 월 패스가 더 저렴해요.</small></div> : <><strong>{job.pay}</strong><small>경력과 진료 범위에 따라 조율합니다.</small><Link className="button primary full" to={`/headhunting?job=${job.id}`}>비공개 상담 신청</Link></>}<button className="button outline full" onClick={onSave}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /> {saved ? '관심공고 저장됨' : '관심공고 저장'}</button></aside>
    </div>
  </Modal>;
}

function ConsultationForm({ initialRole = 'doctor', initialContext = '', initialProfession = '', initialTopic = '' }) {
  const [role, setRole] = useState(initialRole);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(null);
  const professionName = professions.find((item) => item.id === initialProfession)?.name || '';
  const [data, setData] = useState({ topic: initialTopic || (initialProfession ? '직군 오픈 알림' : initialContext ? '특정 공고 문의' : ''), department: professionName, region: '', workType: '', message: '', name: '', phone: '', contactMethod: '전화', contactTime: '상관없음' });
  const topics = role === 'doctor' ? ['이직 가능성 확인', '비공개 포지션', '급여·근무조건 상담', '특정 공고 문의', '직군 오픈 알림'] : ['채용공고 등록', '의료인 추천', '급여·채용조건 설계', '긴급 채용'];
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
    {step === 1 && <div className="consult-step"><div className="role-tabs"><button type="button" className={role === 'doctor' ? 'active' : ''} onClick={() => changeRole('doctor')}><Stethoscope /> 의료인</button><button type="button" className={role === 'hospital' ? 'active' : ''} onClick={() => changeRole('hospital')}><Building2 /> 병원</button></div><div className="step-question"><small>하나만 선택해주세요</small><h4>어떤 상담이 필요하신가요?</h4></div><div className="choice-grid">{topics.map((topic) => <button type="button" key={topic} className={data.topic === topic ? 'selected' : ''} onClick={() => update('topic', topic)}><span>{topic}</span>{data.topic === topic && <Check />}</button>)}</div><button type="button" className="button primary full" disabled={!data.topic} onClick={() => setStep(2)}>다음 · 필요한 조건 입력 <ArrowRight /></button></div>}
      {step === 2 && <div className="consult-step"><div className="step-question"><small>{data.topic}</small><h4>꼭 필요한 조건만 알려주세요</h4><p>정확하지 않아도 괜찮습니다. 담당자가 함께 정리해드려요.</p></div><div className="form-grid"><label><span>{role === 'doctor' ? '직군·전문영역' : '채용 직군·전문영역'} *</span><input value={data.department} onChange={(e) => update('department', e.target.value)} placeholder="예: 내과, 방사선사 CT" autoFocus /></label><label><span>{role === 'doctor' ? '희망 지역' : '병원 지역'}</span><input value={data.region} onChange={(e) => update('region', e.target.value)} placeholder="예: 부산·경남" /></label></div><div className="field-group"><span>{role === 'doctor' ? '희망 근무형태' : '채용 형태'}</span><div className="choice-row">{workTypes.map((item) => <button type="button" key={item} className={data.workType === item ? 'selected' : ''} onClick={() => update('workType', item)}>{item}</button>)}</div></div><label className="wide-field"><span>추가로 전하고 싶은 내용 <i>선택</i></span><textarea value={data.message} onChange={(e) => update('message', e.target.value)} rows="3" placeholder={role === 'doctor' ? '희망 보수나 피하고 싶은 조건을 적어주세요.' : '채용 일정이나 꼭 필요한 경력을 적어주세요.'} /></label><div className="step-actions"><button type="button" className="button outline" onClick={() => setStep(1)}><ArrowLeft /> 이전</button><button type="button" className="button primary" disabled={!data.department.trim()} onClick={() => setStep(3)}>다음 · 연락 방법 <ArrowRight /></button></div></div>}
    {step === 3 && <div className="consult-step"><div className="step-question"><small>마지막 단계</small><h4>어떻게 연락드리면 편하신가요?</h4></div><div className="form-grid"><label><span>{role === 'doctor' ? '성함' : '병원명'} *</span><input required value={data.name} onChange={(e) => update('name', e.target.value)} placeholder={role === 'doctor' ? '성함을 입력해주세요' : '병원명을 입력해주세요'} autoFocus /></label><label><span>연락처 *</span><input required value={data.phone} onChange={(e) => update('phone', e.target.value)} type="tel" placeholder="010-0000-0000" /></label></div><div className="contact-preference"><div><span>연락 방법</span><div className="choice-row">{['전화', '문자'].map((item) => <button type="button" key={item} className={data.contactMethod === item ? 'selected' : ''} onClick={() => update('contactMethod', item)}>{item}</button>)}</div></div><div><span>연락 시간</span><div className="choice-row">{['오전', '오후', '저녁', '상관없음'].map((item) => <button type="button" key={item} className={data.contactTime === item ? 'selected' : ''} onClick={() => update('contactTime', item)}>{item}</button>)}</div></div></div><div className="consult-summary"><small>상담 내용 확인</small><dl><div><dt>상담</dt><dd>{data.topic}</dd></div><div><dt>조건</dt><dd>{data.department}{data.region ? ` · ${data.region}` : ''}{data.workType ? ` · ${data.workType}` : ''}</dd></div><div><dt>연락</dt><dd>{data.contactMethod} · {data.contactTime}</dd></div></dl></div><label className="consent"><input type="checkbox" required name="privacy" value="agreed" /><span>상담을 위한 개인정보 수집·이용에 동의합니다. 입력 정보는 상담 목적으로만 사용됩니다.</span></label><div className="step-actions"><button type="button" className="button outline" onClick={() => setStep(2)}><ArrowLeft /> 이전</button><button className="button primary" type="submit">무료 상담 접수 <ArrowRight /></button></div><p className="form-note"><ShieldCheck /> 의료인 정보는 동의 없이 병원에 공개하지 않습니다.</p></div>}
  </form>;
}

function QuickAccess() {
  return <section className="home-role-actions" aria-label="의료인과 병원 빠른 메뉴">
    <Link className="role-action doctor-action" to="/headhunting">
      <span className="role-action-icon"><MessageCircle /></span><div><small>의료인 · 무료</small><strong>원하는 조건을 말하고 비공개 제안 받기</strong><p>이력서 공개 없이 전담 헤드헌터와 1:1 상담</p></div><span className="role-arrow">상담 시작 <ArrowRight /></span>
    </Link>
    <Link className="role-action hospital-action" to="/advertise">
      <span className="role-action-icon"><Building2 /></span><div><small>병원 · 채용</small><strong>의료인 채용공고 등록하기</strong><p>공고 검수와 지원자 상담까지 함께 지원</p></div><span className="role-arrow">59,000원부터 <ArrowRight /></span>
    </Link>
  </section>;
}

function MemberTeaser() {
  return <section className="member-teaser"><div className="member-icon"><Crown /></div><div><small>MEDIHELPERS MEMBERSHIP</small><h2>둘러보기는 무료, 결정에 필요한 핵심정보는 멤버십으로</h2><p>의료인은 프리미엄 공고를, 병원은 검증된 인재정보와 소개 요청권을 이용할 수 있습니다.</p></div><Link className="button dark" to="/membership">멤버십 비교 <ArrowRight /></Link></section>;
}

function HeroSelect({ value, onChange, options, disabled = false, label }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState('down');
  const rootRef = useRef(null);
  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const menuHeight = Math.min(options.length * 52 + 18, 340);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setPlacement(spaceBelow < menuHeight && spaceAbove > spaceBelow ? 'up' : 'down');
  }, [open, options.length]);
  useEffect(() => {
    const close = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'pointerdown' && rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', close);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', close); };
  }, []);
  return <div ref={rootRef} className={`hero-custom-select ${open ? 'open' : ''} opens-${placement} ${disabled ? 'disabled' : ''}`}>
    <button type="button" className="hero-select-trigger" disabled={disabled} aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}><span>{value}</span><ChevronDown /></button>
    {open && <div className="hero-select-menu" role="listbox" aria-label={`${label} 목록`} data-lenis-prevent>{options.map((option) => { const item = typeof option === 'string' ? { value: option, label: option } : option; return <button type="button" role="option" aria-selected={item.value === value} className={item.value === value ? 'selected' : ''} key={item.value} onClick={() => { onChange(item.value); setOpen(false); }}>{item.label}{item.value === value && <Check />}</button>; })}</div>}
  </div>;
}

function MotionNotice() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const forced = readStoredString('medihelpers_motion') === 'full';
    document.documentElement.classList.toggle('force-motion', forced);
    setVisible(window.matchMedia('(prefers-reduced-motion: reduce)').matches && !forced);
  }, []);
  if (!visible) return null;
  return <aside className="motion-notice"><Activity /><div><strong>이 PC에서 모션 효과가 줄어들고 있습니다</strong><span>Windows 또는 브라우저의 애니메이션 줄이기 설정을 감지했습니다.</span></div><button onClick={() => { writeStoredString('medihelpers_motion', 'full'); document.documentElement.classList.add('force-motion'); window.location.reload(); }}>이 사이트에서는 켜기</button></aside>;
}
function HomePage() {
  const [profession, setProfession] = useState('doctor');
  const [dept, setDept] = useState('전체 진료과');
  const [region, setRegion] = useState('전국');
  const search = () => profession === 'doctor' ? navigate(`/jobs?dept=${encodeURIComponent(dept)}&region=${encodeURIComponent(region)}`) : navigate(`/headhunting?profession=${profession}`);
  return <>
    <section className="home-hero">
      <div className="hero-copy"><span className="eyebrow"><Sparkles size={15} /> 모든 의료 커리어를 한곳에서</span><h1>의료인 채용,<br /><em>직군부터 정확하게.</em></h1><p>의사부터 간호·약무·방사선·임상병리·재활까지<br />내 전문영역을 선택하면 맞는 공간으로 연결됩니다.</p>
        <div className="hero-search-card" role="search" aria-label="의료 채용 검색">
          <div className="hero-search-title"><span><Search /></span><div><strong>내 전문영역의 채용 찾기</strong><small>직군·전문영역·지역만 선택하면 됩니다</small></div><em className="hero-search-badge">1분 검색</em></div>
          <div className="hero-search-fields">
            <label><small>의료 직군</small><span><UsersRound size={19} /><HeroSelect label="의료 직군" value={profession} onChange={setProfession} options={professions.map((item) => ({ value: item.id, label: item.short }))} /></span></label>
            <label><small>{profession === 'doctor' ? '진료과' : '전문영역'}</small><span><Stethoscope size={19} /><HeroSelect label={profession === 'doctor' ? '진료과' : '전문영역'} value={profession === 'doctor' ? dept : '전체 전문영역'} disabled={profession !== 'doctor'} onChange={setDept} options={profession === 'doctor' ? departments : ['전체 전문영역']} /></span></label>
            <label><small>지역</small><span><MapPin size={19} /><HeroSelect label="지역" value={region} onChange={setRegion} options={regions} /></span></label>
            <button className="hero-search-button" onClick={search}>{profession === 'doctor' ? '채용정보 보기' : '오픈 알림 신청'} <ArrowRight /></button>
          </div>
          <div className="popular-searches"><span>많이 찾는 조건</span><Link to="/jobs?keyword=주%204일">주 4일</Link><Link to="/jobs?keyword=검진센터">검진센터</Link><Link to="/jobs?region=서울">서울</Link><Link to="/jobs?region=부산">부산</Link></div>
        </div>
        <div className="hero-assurance"><ShieldCheck /><span><strong>상담 전까지 개인정보 비공개</strong> · 채용정보 탐색은 무료입니다</span></div>
      </div>
      <div className="concierge-card">
        <div className="concierge-head"><span><UserRoundSearch /></span><div><small>MEDIHELPERS CONCIERGE</small><strong>1:1 커리어 매칭</strong></div><i>LIVE</i></div>
        <div className="match-score"><div className="score-ring trust"><strong>3</strong><span>단계</span></div><div><small>메디헬퍼스 검수 기준</small><h3>많은 공고보다<br />확인된 조건을 먼저</h3></div></div>
        <div className="mini-position"><span className="mini-icon blue"><FileCheck2 /></span><div><small>STEP 01</small><strong>병원·담당자 확인</strong><p>연락 가능한 채용공고인지 확인</p></div><b>확인</b></div>
        <div className="mini-position"><span className="mini-icon mint"><ClipboardCheck /></span><div><small>STEP 02·03</small><strong>근무조건 확인·상담 연결</strong><p>모호한 조건은 담당자가 직접 확인</p></div><b>연결</b></div>
        <div className="concierge-foot"><CircleCheck size={16} /> 상담부터 조건 협상까지 함께합니다</div>
      </div>
    </section>
    <QuickAccess />
    <MemberTeaser />
    <section className="section soft"><div className="section-head"><div><span className="section-kicker">CURATED POSITIONS</span><h2>지금 주목할 채용</h2><p>조건과 신뢰도를 확인한 포지션을 먼저 소개합니다.</p></div><Link className="button outline" to="/jobs">전체 채용 보기 <ArrowRight size={17} /></Link></div><div className="job-grid">{prioritizeJobs(jobs).slice(0, 3).map((job) => <JobCard key={job.id} job={job} saved={false} onSave={() => {}} onOpen={() => navigate(`/jobs?open=${job.id}`)} />)}</div></section>
    <section className="dual-path section"><div className="path-card doctor"><span className="path-icon"><Stethoscope /></span><small>의료인이라면</small><h2>내 조건을 먼저 말하고<br />비공개 제안을 받으세요</h2><p>이력서를 공개하지 않아도 전담 헤드헌터가 적합한 병원을 찾아드립니다.</p><ul><li><Check /> 개인정보 비공개</li><li><Check /> 연봉·근무조건 협상</li><li><Check /> 입사 후 피드백</li></ul><Link className="button dark" to="/headhunting">구직 상담 시작</Link></div><div className="path-card hospital"><span className="path-icon"><Building2 /></span><small>의료기관이라면</small><h2>광고와 인재 추천을<br />한 번에 시작하세요</h2><p>공고 등록부터 후보 발굴, 면접 일정까지 필요한 만큼 선택할 수 있습니다.</p><ul><li><Check /> 전문과목별 인재풀</li><li><Check /> 검증된 채용공고</li><li><Check /> 성과형 헤드헌팅</li></ul><Link className="button light" to="/advertise">광고 상품 보기</Link></div></section>
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

function matchesJob(job, { dept, region, keyword }) {
  const deptOk = dept === '전체 진료과' || job.dept === dept;
  const regionOk = region === '전국' || job.region === region;
  const keywordOk = !keyword || `${job.hospital} ${job.title} ${job.summary} ${job.location} ${job.dept} ${job.type} ${job.schedule} ${job.pay} ${job.benefits.join(' ')}`.toLowerCase().includes(keyword.toLowerCase());
  return deptOk && regionOk && keywordOk;
}

function usePremiumSlotCount() {
  const [count, setCount] = useState(() => window.matchMedia('(max-width: 780px)').matches ? 1 : 2);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 780px)');
    const update = () => setCount(media.matches ? 1 : 2);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
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
    const update = () => setReducedMotion(!document.documentElement.classList.contains('force-motion') && media.matches);
    const onVisibility = () => setDocumentVisible(!document.hidden);
    update();
    document.addEventListener('visibilitychange', onVisibility);
    media.addEventListener?.('change', update);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      media.removeEventListener?.('change', update);
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
      {!reducedMotion && <div className="premium-rotation-progress" aria-hidden="true"><i key={safePage} /></div>}
    </>}
  </div>;
}

function JobsPage({ route }) {
  const params = new URLSearchParams(route.split('?')[1] || '');
  const [dept, setDept] = useState(params.get('dept') || '전체 진료과');
  const [region, setRegion] = useState(params.get('region') || '전국');
  const [keyword, setKeyword] = useState(params.get('keyword') || '');
  const [saved, setSaved] = useState(() => readStoredArray('medihelpers_saved_jobs'));
  const [selected, setSelected] = useState(() => jobs.find((job) => job.id === params.get('open')) || null);
  const [standardVisible, setStandardVisible] = useState(STANDARD_STEP);

  // 하루 동안 고정되는 결정적 회전 seed (UTC 일 단위). 세션당 한 번만 계산.
  const daySeed = useMemo(() => Math.floor(Date.now() / 86400000), []);
  const premiumSessionSeed = useMemo(() => daySeed + Math.floor(Math.random() * 1000000), [daySeed]);

  // 진료과 빠른 필터용: 진료과 필터 이전, 지역+키워드만 적용한 결과의 진료과별 개수.
  const specialtyStrip = useMemo(() => {
    const scoped = jobs.filter((job) => matchesJob(job, { dept: '전체 진료과', region, keyword }));
    const counts = Object.fromEntries(countByDept(scoped).map((item) => [item.key, item.count]));
    const items = [{ key: '전체 진료과', label: '전체', count: scoped.length }];
    departments.forEach((name) => {
      if (name === '전체 진료과') return;
      if (counts[name]) items.push({ key: name, label: name, count: counts[name] });
    });
    return items;
  }, [region, keyword]);

  const filtered = useMemo(() => jobs.filter((job) => matchesJob(job, { dept, region, keyword })), [dept, region, keyword]);
  // 프리미엄: 등급 우선순위 유지 + 등급 내부 진료과·지역 균형.
  const orderedPromoted = useMemo(() => orderPremium(filtered.filter((job) => job.adTier), { seed: premiumSessionSeed }), [filtered, premiumSessionSeed]);
  // 일반: 진료과·지역 라운드로빈 균형.
  const orderedStandard = useMemo(() => balancedOrder(filtered.filter((job) => !job.adTier), { seed: daySeed }), [filtered, daySeed]);

  // 필터 변경 시 더보기 카운트 초기화.
  useEffect(() => {
    setStandardVisible(STANDARD_STEP);
  }, [dept, region, keyword]);

  const toggleSaved = (id) => setSaved((current) => {
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    writeStoredValue('medihelpers_saved_jobs', next);
    return next;
  });
  const resetFilters = () => {
    setDept('전체 진료과');
    setRegion('전국');
    setKeyword('');
    setStandardVisible(STANDARD_STEP);
  };
  const renderCard = (job) => <JobCard key={job.id} job={job} saved={saved.includes(job.id)} onSave={() => toggleSaved(job.id)} onOpen={() => { trackConversion('job_detail_open', { jobId: job.id }); setSelected(job); }} />;

  const visibleStandard = orderedStandard.slice(0, standardVisible);
  const standardRemaining = orderedStandard.length - visibleStandard.length;

  return <>
    <PageHero
      tone="jobs-hero"
      eyebrow="MEDICAL JOBS"
      title={<><span className="jobs-hero-part">조건부터 비교하는</span>{' '}<span className="jobs-hero-part">의료 채용정보</span></>}
      description={<><span className="jobs-description-part">현재 의사 채용정보를</span>{' '}<span className="jobs-description-part">우선 운영하고 있습니다.</span>{' '}<span className="jobs-description-part">다른 보건의료 직군은 전용관에서</span>{' '}<span className="jobs-description-part">오픈 알림을 신청할 수 있습니다.</span></>}
    ><Link className="button outline" to="/headhunting">헤드헌팅 상담 <ArrowRight /></Link></PageHero>
    <section className="section jobs-page"><div className="filter-bar"><label><Stethoscope /><select value={dept} onChange={(e) => setDept(e.target.value)}>{departments.map((item) => <option key={item}>{item}</option>)}</select></label><label><MapPin /><select value={region} onChange={(e) => setRegion(e.target.value)}>{regions.map((item) => <option key={item}>{item}</option>)}</select></label><label className="filter-keyword"><Search /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="병원명, 근무조건 검색" /></label></div>
      <div className="specialty-strip" role="group" aria-label="진료과 빠른 필터">{specialtyStrip.map((item) => <button key={item.key} type="button" className={`specialty-chip ${dept === item.key ? 'active' : ''}`} aria-pressed={dept === item.key} onClick={() => setDept(item.key)}><span>{item.label}</span><b>{item.count}</b></button>)}</div>
      <Link className="job-ad-banner" to="/advertise"><span>초기 파트너 모집</span><strong>검수된 의료인 채용공고를 등록하세요</strong><small>30일 59,000원부터 · 공고 문구 검수 지원</small><b>광고 상품 보기 <ArrowRight /></b></Link>
      <div className="result-row"><strong>{filtered.length}개의 채용공고</strong><span><Heart size={15} /> 관심공고 {saved.length}개</span></div>
      {filtered.length ? <>
        <div className="balance-legend"><span className="balance-legend-icon"><Sparkles /></span><div><strong>균형 노출</strong><p>광고 등급 우선순위는 그대로 유지하고, 같은 등급 안에서는 진료과·지역을 고르게 섞어 순환합니다. 일반 공고도 특정 영역에 몰리지 않도록 번갈아 배치합니다.</p></div></div>
        {orderedPromoted.length > 0 && <div className="promoted-jobs"><div className="promotion-heading"><div><span><Crown /> PREMIUM PLACEMENT</span><strong>지금 주목할 집중채용</strong></div><small>화면을 보고 있을 때만 다음 광고로 자동 전환됩니다</small></div><PremiumAdCarousel items={orderedPromoted} renderCard={renderCard} /></div>}
        {orderedStandard.length > 0 && <div className="standard-jobs"><div className="standard-heading"><strong>전체 채용공고</strong><span>진료과·지역 균형순 · {visibleStandard.length}/{orderedStandard.length}</span></div><div className="job-grid">{visibleStandard.map(renderCard)}</div>{standardRemaining > 0 && <button type="button" className="standard-more" onClick={() => setStandardVisible((current) => current + STANDARD_STEP)}>공고 더보기 <em>남은 {standardRemaining}개</em> <ArrowRight size={16} /></button>}</div>}
        <div className="decision-nudge"><div><span><Crown /> MATCHING REPORT</span><h3>{saved.length ? `찜한 ${saved.length}개 병원, 조건별로 비교해보세요` : '관심 병원을 고르고 매칭 리포트를 만들어보세요'}</h3><p>근무·보수·거리·진료 범위를 비교하고 확인할 질문을 헤드헌터에게 그대로 전달합니다.</p></div><Link className="button dark" to="/matching-report?role=doctor" onClick={() => trackConversion('jobs_matching_report', { savedCount: saved.length })}>매칭 리포트 만들기 <ArrowRight /></Link></div>
      </> : <div className="empty-state"><Search /><h3>조건에 맞는 공고를 찾지 못했습니다</h3><p>검색 조건을 바꾸거나 헤드헌터에게 비공개 포지션을 문의해보세요.</p><button className="button primary" onClick={resetFilters}>검색 초기화</button></div>}
    </section>
    <ConversionBanner title="공개된 공고에 원하는 조건이 없나요?" description="등록되지 않은 비공개 포지션까지 함께 찾아드립니다." />
    {selected && <JobDetail job={selected} saved={saved.includes(selected.id)} onSave={() => toggleSaved(selected.id)} onClose={() => setSelected(null)} />}
  </>;
}

function TalentPage() {
  const [dept, setDept] = useState('전체 진료과');
  const [saved, setSaved] = useState(() => readStoredArray('medihelpers_saved_talent'));
  const visible = dept === '전체 진료과' ? talent : talent.filter((person) => person.dept === dept);
  const toggleSaved = (code) => setSaved((current) => {
    const next = current.includes(code) ? current.filter((item) => item !== code) : [...current, code];
    writeStoredValue('medihelpers_saved_talent', next);
    return next;
  });
  return <>
    <PageHero tone="mint" eyebrow="VERIFIED TALENT" title="병원이 기다리는 익명 의료인 인재풀" description="후보자의 동의 전에는 개인정보를 공개하지 않습니다. 필요한 진료과와 조건을 알려주시면 전담 컨설턴트가 직접 연결합니다."><Link className="button primary" to="/headhunting?role=hospital">우리 병원 인재 추천받기</Link></PageHero>
    <section className="section"><div className="notice-bar"><ShieldCheck /><div><strong>안전한 익명 인재정보</strong><p>전문과·연차·희망 조건·입사 가능 시점까지 무료로 비교하세요. 검증 상세정보와 소개 요청은 필요한 후보에게만 사용할 수 있습니다.</p></div></div><div className="talent-toolbar"><div><span className="section-kicker">ACTIVE CANDIDATES</span><h2>최근 상담 완료 인재</h2></div><select value={dept} onChange={(e) => setDept(e.target.value)}>{departments.slice(0, -2).map((item) => <option key={item}>{item}</option>)}</select></div><div className="talent-grid">{visible.map((person) => <article className="talent-card" key={person.code}><div className="talent-top"><span className="avatar"><UserRound /></span><div><small>{person.code}</small><h3>{person.dept} · {person.career}</h3></div><BadgeCheck /><button className={`talent-save ${saved.includes(person.code) ? 'saved' : ''}`} onClick={() => toggleSaved(person.code)} aria-label={`${person.code} 후보 찜하기`}><Heart fill={saved.includes(person.code) ? 'currentColor' : 'none'} /></button></div><dl><div><dt>희망 지역</dt><dd>{person.region}</dd></div><div><dt>희망 조건</dt><dd>{person.preference}</dd></div><div><dt>입사 가능</dt><dd>{person.available}</dd></div></dl><div className="talent-lock-preview"><span><LockKeyhole /> 유료 상세정보</span><p>근무기관 이력 · 세부 술기 · 이직 사유 · 컨설턴트 확인 메모</p></div><Link className="button outline full" to={`/membership?type=hospital&candidate=${person.code}`} onClick={() => trackConversion('talent_intro_cta', { candidate: person.code })}>이 후보 소개 요청 · 39,000원</Link></article>)}</div><div className="decision-nudge report-nudge"><div><span><BarChart3 /> MATCHING REPORT</span><h3>{saved.length ? `찜한 ${saved.length}명 후보, 채용조건과 비교해보세요` : '관심 후보를 찜하고 적합 조건을 비교해보세요'}</h3><p>전문과목·경력·희망 지역·입사 시점을 비교하고 확인 질문을 헤드헌터에게 전달합니다.</p></div><Link className="button dark" to="/matching-report?role=hospital">후보 매칭 리포트 <ArrowRight /></Link></div></section>
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
    <section className="section consultation-layout"><div className="consult-copy"><span className="section-kicker">1:1 CONCIERGE</span><h2>광고보다 먼저,<br />상황을 정확히 듣습니다</h2><p>같은 직군이라도 원하는 삶과 병원의 사정은 다릅니다. 메디헬퍼스는 숫자만 맞추지 않고 오래 만족할 수 있는 연결을 찾습니다.</p><div className="consult-points"><div><span><Phone /></span><div><strong>빠른 첫 연락</strong><p>접수 내용을 확인하고 가능한 시간에 연락드립니다.</p></div></div><div><span><ShieldCheck /></span><div><strong>철저한 비공개</strong><p>동의 전에는 이직 의사와 병원 내부정보를 공개하지 않습니다.</p></div></div><div><span><TrendingUp /></span><div><strong>실제 조건 협상</strong><p>보수, 일정, 업무범위를 구체적으로 조율합니다.</p></div></div></div><div className="direct-contact"><small>바로 상담하고 싶다면</small><a href="tel:0513425463">051-342-5463</a><span>평일 09:00–18:00</span></div></div><ConsultationForm key={`${role}-${context}-${profession}`} initialRole={role} initialContext={context} initialProfession={profession} /></section>
    <section className="section soft"><div className="section-head centered"><div><span className="section-kicker">TWO-SIDED SERVICE</span><h2>의료인과 병원, 서로 다른 고민을 해결합니다</h2></div></div><div className="compare-grid"><div><Stethoscope /><h3>의료인에게</h3><ul><li><Check /> 공개하지 않고 이직 가능성 확인</li><li><Check /> 비공개 포지션과 실제 근무조건 안내</li><li><Check /> 연봉·진료범위·스케줄 협상 지원</li><li><Check /> 퇴사와 입사 일정 조율</li></ul></div><div><Building2 /><h3>의료기관에게</h3><ul><li><Check /> 채용조건 정리와 공고 문구 개선</li><li><Check /> 익명 인재풀 후보 발굴</li><li><Check /> 면접 일정과 후보 피드백 관리</li><li><Check /> 광고 또는 성공보수 방식 선택</li></ul></div></div></section>
  </>;
}

function Checkout({ plan, onClose }) {
  const [done, setDone] = useState(false);
  const [method, setMethod] = useState('card');
  const [logoPreview, setLogoPreview] = useState('');
  const [logoName, setLogoName] = useState('');
  const [logoError, setLogoError] = useState('');
  useEffect(() => () => logoPreview && URL.revokeObjectURL(logoPreview), [logoPreview]);
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
  const submit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const logo = formData.get('logo');
    formData.delete('logo');
    const data = { ...Object.fromEntries(formData.entries()), logoName: logo instanceof File && logo.size ? logo.name : '' };
    appendStoredRecord('medihelpers_ad_requests', { id: `AD-${Date.now()}`, planId: plan.id, amount: plan.price, paymentMethod: method, status: 'payment-link-requested', createdAt: new Date().toISOString(), ...data });
    setDone(true);
  };
  return <Modal onClose={onClose} wide label="병원 광고 상품 신청">{done ? <div className="checkout-success"><span><CircleCheck /></span><h2>광고 결제 요청이 접수되었습니다</h2><p>공고 내용과 병원 브랜드 정보를 확인한 뒤 결제 안내를 보내드립니다.<br />PG 연동 전까지는 이 단계에서 실제 금액이 청구되지 않습니다.</p><button className="button primary" onClick={onClose}>확인</button></div> : <><div className="checkout-title"><small>ADVERTISEMENT ORDER</small><h2>광고 상품 신청</h2><p>병원 브랜드와 채용정보를 함께 검수한 뒤 결제 링크와 게시 일정을 안내합니다.</p></div><form className="checkout-grid" onSubmit={submit}><div className="checkout-form"><div className="brand-upload"><div className="logo-preview">{logoPreview ? <img src={logoPreview} alt="선택한 병원 로고 미리보기" /> : <Building2 />}</div><label><span>병원 로고 <i>선택 · 권장</i></span><input name="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={selectLogo} /><div className="upload-button"><Upload /><div><strong>{logoName || '로고 파일 선택'}</strong><small>PNG·JPG·WEBP, 최대 5MB</small></div></div>{logoError && <em>{logoError}</em>}</label></div><div className="form-grid"><label><span>병원명 *</span><input required name="hospital" placeholder="병원명을 입력해주세요" /></label><label><span>기관 유형 *</span><select required name="facilityType" defaultValue=""><option value="" disabled>기관 유형 선택</option><option>종합병원</option><option>병원</option><option>요양병원</option><option>한방병원</option><option>의원</option><option>검진·전문센터</option><option>기타 의료기관</option></select></label><label><span>담당자명 *</span><input required name="manager" placeholder="담당자 성함" /></label><label><span>연락처 *</span><input required name="phone" type="tel" placeholder="010-0000-0000" /></label><label><span>이메일 *</span><input required name="email" type="email" placeholder="billing@hospital.co.kr" /></label><label><span>병원 위치 *</span><input required name="address" placeholder="예: 부산광역시 연제구" /></label></div><label className="wide-field"><span>채용 직군·전문영역 *</span><input required name="department" placeholder="예: 정형외과 전문의, 방사선사 CT" /></label><label className="wide-field"><span>병원·채용 소개 <i>선택</i></span><textarea name="introduction" rows="3" placeholder="진료 환경, 기관의 강점, 채용 인원과 일정을 간단히 적어주세요." /></label><div className="payment-choice"><span>결제 안내 방식</span><div><button type="button" className={method === 'card' ? 'active' : ''} onClick={() => setMethod('card')}><CreditCard /> 카드 결제 링크</button><button type="button" className={method === 'transfer' ? 'active' : ''} onClick={() => setMethod('transfer')}><Banknote /> 계좌이체·세금계산서</button></div></div><label className="consent"><input required type="checkbox" name="terms" value="agreed" /><span>광고 검수, 결제 안내 및 개인정보 수집·이용에 동의합니다. 병원 로고는 사용 권한을 확인한 파일만 등록합니다.</span></label></div><aside className="order-summary"><small>선택한 상품</small><h3>{plan.name}</h3><p>{plan.unit} 노출</p><ul>{plan.features.map((item) => <li key={item}><Check />{item}</li>)}</ul><div className="price-row"><span>결제 예정금액<small>부가세 포함</small></span><strong>{plan.price.toLocaleString()}원</strong></div><button className="button primary full" type="submit">결제 안내 요청하기 <ArrowRight size={17} /></button><p className="secure-note"><ShieldCheck /> 실제 결제는 공고 검수 후 진행됩니다.</p></aside></form></>}</Modal>;
}

function AdvertisePage() {
  const [plan, setPlan] = useState(null);
  return <>
    <PageHero tone="ad" eyebrow="HOSPITAL AD CENTER" title="좋은 의료인에게 먼저 닿는 채용광고" description="초기 파트너 가격 59,000원부터 시작합니다. 공고만 올리는 광고부터 전담 컨설턴트가 후보를 찾는 집중 채용까지 필요한 만큼 선택하세요."><a className="button light" href="#plans">광고 상품 비교</a></PageHero>
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
    <section className="section ad-preview-section" id="ad-preview"><div className="ad-preview-copy"><span className="section-kicker">LIVE LIST CARD PREVIEW</span><h2>실제 채용정보에서는<br />이 카드로 노출됩니다</h2><p>광고 신청 전에 사용자가 보게 될 집중채용 카드의 크기와 정보 순서를 그대로 확인하세요. 병원명, 공고 제목, 지역과 근무조건이 한 흐름으로 이어집니다.</p><ul><li><Check /> 실제 채용정보 목록과 동일한 카드 디자인</li><li><Check /> 병원 로고와 집중채용 등급을 선명하게 강조</li><li><Check /> 목록 최상단 우선 배치와 전담 컨설턴트 연결</li></ul><button className="button primary" onClick={() => setPlan(adPlans[2])}>집중채용 광고 신청 <ArrowRight /></button></div><div className="ad-preview-frame"><span className="preview-disclaimer"><ShieldCheck /> 디자인 예시 · 실제 공고 아님</span><div className="preview-list-heading"><span><Crown /> PREMIUM PLACEMENT</span><strong>먼저 보는 집중채용</strong><small>채용정보 실제 노출 카드</small></div><JobCard job={advertisementPreviewJob} saved={false} onSave={() => {}} onOpen={() => setPlan(adPlans[2])} preview /></div></section>
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
  return <Modal onClose={onClose}>{done ? <div className="checkout-success"><span><CircleCheck /></span><h2>멤버십 결제 요청이 접수되었습니다</h2><p>회원 유형과 자격을 확인한 뒤 안전한 결제 링크를 보내드립니다.<br />현재는 실제 금액이 청구되지 않습니다.</p><button className="button primary" onClick={onClose}>확인</button></div> : <div className="membership-checkout"><small>MEMBERSHIP ORDER</small><h2>{plan.name}</h2><p>{plan.description}</p><div className="membership-price"><strong>{plan.price.toLocaleString()}원</strong><span>/ {plan.period}</span></div><form onSubmit={submit}><label><span>{plan.audience === 'doctor' ? '의료인 성함' : '병원명'} *</span><input required name="name" /></label><label><span>연락처 *</span><input required name="phone" type="tel" placeholder="010-0000-0000" /></label><label><span>이메일 *</span><input required name="email" type="email" /></label><label className="consent"><input required type="checkbox" name="terms" value="agreed" /><span>회원 자격 확인, 결제 안내 및 개인정보 수집·이용에 동의합니다.</span></label><button className="button primary full" type="submit">결제 안내 요청하기 <ArrowRight /></button></form><p className="secure-note"><ShieldCheck /> 자격 확인 후 권한이 활성화됩니다.</p></div>}</Modal>;
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

function MembershipPage({ route }) {
  const params = new URLSearchParams(route.split('?')[1] || '');
  const [type, setType] = useState(params.get('type') === 'hospital' ? 'hospital' : 'doctor');
  const [selected, setSelected] = useState(null);
  const plans = membershipPlans.filter((plan) => plan.audience === type);
  const contextId = params.get('job') || params.get('candidate');
  const contextType = params.get('candidate') ? 'hospital' : params.get('job') ? 'doctor' : null;
  const contextPlan = membershipPlans.find((plan) => plan.id === `${type}-single`);
  return <>
    <PageHero tone="membership" eyebrow="EARLY ACCESS PRICE" title="필요한 핵심정보만, 2,900원부터" description="기본 검색과 상담은 무료로 시작하고, 실제 결정에 필요한 검증 정보만 건별 열람권 또는 초기 멤버십 가격으로 이용합니다." />
    <section className="section membership-section"><div className="membership-tabs"><button className={type === 'doctor' ? 'active' : ''} onClick={() => setType('doctor')}><Stethoscope /> 의료인용</button><button className={type === 'hospital' ? 'active' : ''} onClick={() => setType('hospital')}><Building2 /> 병원용</button></div>{contextId && <div className="context-offer"><div><span><CircleCheck /> 무료 미리보기 확인 완료</span><h3>{type === 'doctor' ? '선택한 공고의 핵심조건만 바로 열어보세요' : '선택한 후보의 검증정보와 소개를 요청하세요'}</h3><p>{type === 'doctor' ? '상세 급여·당직·협의조건을 한 번에 확인합니다.' : '후보자 동의 확인부터 첫 인터뷰 연결까지 지원합니다.'}</p></div><button className="button primary" onClick={() => { trackConversion('context_single_offer', { type, contextId }); setSelected(contextPlan); }}>{contextPlan.price.toLocaleString()}원으로 계속</button></div>}<div className="access-explain"><div><span className="access-number">FREE</span><h3>무료로 충분히 비교</h3><p>{type === 'doctor' ? '진료과, 지역, 기본 근무형태와 공개 공고' : '진료과, 경력 연차, 희망 지역과 입사 가능 시점'}</p></div><ArrowRight /><div className="paid-access"><span className="access-number">UNLOCK</span><h3>결정할 때만 결제</h3><p>{type === 'doctor' ? '상세 급여, 정확한 근무시간, 비공개 병원 및 포지션' : '검증 경력, 세부 술기, 동의 기반 소개 요청'}</p></div></div><ValueCalculator key={type} type={type} onChoose={setSelected} /><div className="membership-grid">{plans.map((plan) => <article className={`membership-card ${plan.featured ? 'featured' : ''}`} key={plan.id}>{plan.featured && <span className="popular">추천</span>}<small>{plan.period === '월' ? 'MONTHLY PASS' : 'ONE-TIME ACCESS'}</small><h2>{plan.name}</h2><p>{plan.description}</p><div className="price"><strong>{plan.price.toLocaleString()}</strong><span>원 / {plan.period}</span></div><ul>{plan.features.map((feature) => <li key={feature}><Check /> {feature}</li>)}</ul><button className={`button ${plan.featured ? 'primary' : 'outline'} full`} onClick={() => { trackConversion('membership_plan_select', { planId: plan.id }); setSelected(plan); }}>이용권 신청</button></article>)}</div><div className="privacy-gate"><ShieldCheck /><div><strong>결제해도 개인정보를 바로 판매하지 않습니다</strong><p>병원은 검증된 익명 정보를 열람하고 소개를 요청합니다. 의료인의 명시적 동의가 확인된 뒤에만 필요한 범위의 정보가 전달됩니다.</p></div></div></section>
    {selected && <MembershipCheckout plan={selected} onClose={() => setSelected(null)} />}
  </>;
}

function AboutPage() {
  return <>
    <PageHero tone="about" eyebrow="ABOUT MEDIHELPERS" title="의료 채용을 사람답게 만드는 연결" description="메디헬퍼스는 의료기관과 의료인의 조건만 맞추지 않습니다. 서로 오래 신뢰할 수 있는 선택을 만들기 위해 직접 듣고 확인하고 조율합니다." />
    <section className="section story-layout"><div><span className="section-kicker">WHY MEDIHELPERS</span><h2>채용공고 너머의<br />진짜 사정을 이해합니다</h2></div><div><p>의료인의 이직은 생활과 가족, 진료 철학까지 함께 움직이는 결정입니다. 병원의 채용 역시 단순히 빈자리를 채우는 일이 아니라 환자와 조직의 미래를 정하는 일입니다.</p><p>그래서 메디헬퍼스는 거대한 익명 게시판 대신, 전담 헤드헌터가 양측의 이야기를 직접 듣고 필요한 정보만 안전하게 연결하는 방식을 선택했습니다.</p></div></section>
    <section className="section soft"><div className="value-grid"><div><span>01</span><ShieldCheck /><h3>신뢰를 먼저</h3><p>개인정보와 내부정보를 함부로 공개하지 않고 동의를 기준으로 움직입니다.</p></div><div><span>02</span><UserRoundSearch /><h3>사람이 직접</h3><p>자동 추천만으로 끝내지 않고 담당자가 조건과 맥락을 확인합니다.</p></div><div><span>03</span><Target /><h3>좋은 결과까지</h3><p>소개 건수보다 만족스러운 입사와 채용 완료를 목표로 합니다.</p></div></div></section>
    <section className="section contact-section"><div className="contact-card"><span className="section-kicker">CONTACT</span><h2>어떤 고민부터 이야기할까요?</h2><p>이직을 아직 결정하지 않았거나 채용 조건이 정리되지 않았어도 괜찮습니다.</p><div><a href="tel:0513425463"><Phone /> <span><small>전화 상담</small><strong>051-342-5463</strong></span></a><a href="mailto:hr@medihelpers.co.kr"><Mail /> <span><small>이메일</small><strong>hr@medihelpers.co.kr</strong></span></a></div></div><div className="policy-card"><h3>개인정보와 서비스 운영 원칙</h3><ul><li>상담 정보는 요청한 상담과 매칭 목적으로만 사용합니다.</li><li>의료인 프로필은 본인 동의 없이 병원에 공개하지 않습니다.</li><li>병원 채용정보는 사실 확인과 표현 검수 후 게시합니다.</li><li>광고비와 헤드헌팅 비용은 계약·결제 전에 명확히 안내합니다.</li></ul><p>정식 회원 기능과 결제 도입 전에 이용약관, 개인정보처리방침, 환불정책을 법률 검토 후 별도 게시합니다.</p></div></section>
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
  useSmoothPageScroll();
  useScrollMotion(route);
  const path = route.split('?')[0].replace(/\/$/, '') || '/';
  let page;
  if (path === '/') page = <HomePage />;
  else if (path === '/jobs') page = <JobsPage route={route} />;
  else if (path === '/professions') page = <Redirect to="/headhunting" />;
  else if (path === '/talent') page = <TalentPage />;
  else if (path === '/matching-report') page = <MatchingReportPage route={route} jobs={jobs} talent={talent} onNavigate={navigate} />;
  else if (path === '/headhunting') page = <HeadhuntingPage route={route} />;
  else if (path === '/advertise') page = <AdvertisePage />;
  else if (path === '/membership') page = <MembershipPage route={route} />;
  else if (path === '/signup/doctor') page = <AccountPage memberType="doctor" />;
  else if (path === '/signup/hospital') page = <AccountPage memberType="hospital" />;
  else if (path === '/signup' || path === '/account') page = <AccountPage />;
  else if (path === '/about') page = <AboutPage />;
  else page = <NotFoundPage />;
  return <div className="app"><div className="scroll-progress" aria-hidden="true" /><Header path={path} /><main key={route} className="route-stage">{page}</main><Footer /><MotionNotice /><div className="mobile-quickbar"><Link to="/jobs"><Search />채용 찾기</Link><Link className="mobile-ad" to="/advertise"><Building2 />공고 등록</Link></div></div>;
}
