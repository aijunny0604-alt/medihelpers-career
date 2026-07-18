import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Ambulance, ArrowLeft, ArrowRight, BadgeCheck, Banknote, BarChart3, BriefcaseBusiness, Building2,
  CalendarDays, Check, ChevronLeft, ChevronRight, CircleCheck, ClipboardCheck, Clock3,
  CreditCard, Crown, FileCheck2, Heart, HeartPulse, LockKeyhole, Mail, MapPin, Menu, MessageCircle, Microscope, Phone, Pill,
  ScanLine, Search, ShieldCheck, Smile, Sparkles, Stethoscope, Target, TrendingUp, Upload, UserRound,
  UserRoundSearch, UsersRound, WalletCards, X
} from 'lucide-react';
import { adPlans, jobs, membershipPlans, navItems, talent, talentUnlockPlans } from './data.js';
import { canRevealTalentIdentity, talentDisplayName } from './talentPrivacy.js';
import MatchingReportPage from './MatchingReportPage.jsx';
import AccountPage from './AccountPage.jsx';
import ResumePage from './ResumePage.jsx';
import HeadHunterRequestPage from './HeadHunterRequestPage.jsx';
import HeroSelect from './CustomSelect.jsx';
import QaPreviewPage from './QaPreviewPage.jsx';
import ConsultationAdminPage from './ConsultationAdminPage.jsx';
import MemberCenterPage from './MemberCenterPage.jsx';
import AccountRecoveryPage from './AccountRecoveryPage.jsx';
import MedicalStaffPage, { MedicalStaffDetailPage } from './MedicalStaffPage.jsx';
import RecruitmentCrmPage from './RecruitmentCrmPage.jsx';
import AdminConsolePage from './AdminConsolePage.jsx';
import { PrivacyPolicyPage, TermsPage } from './LegalPages.jsx';
import { operationalDoctorJobs, operationalTalent, useSiteOperations } from './siteOperations.js';
import { getQaStateInfo, normalizeQaState, QA_PREVIEW_STORAGE_KEY } from './qaPreview.js';
import { getHospitalMood, hospitalMoodStyle } from './hospitalMood.js';
import {
  appendStoredRecord,
  readStoredArray,
  readStoredString,
  syncSavedToServer,
  writeStoredString,
  writeStoredValue
} from './browserStorage.js';
import { appBase, withBase } from './basePath.js';
import { useAccountProfile } from './useAccountProfile.js';
import { balancedOrder, countByDept } from './jobExposure.js';

const departments = ['전체 진료과', '내과', '정형외과', '소아청소년과', '가정의학과', '영상의학과', '마취통증의학과', '전문의'];
const regions = ['전국', '서울', '경기', '인천', '부산', '경남', '충북', '강원'];
const recruitmentTypes = ['전체 초빙', '봉직의', '원장·센터장', '검진·판독', '비임상·기업'];
const doctorConditions = ['전체 조건', '주 4일', '당직 협의', '숙소 지원', '검진 중심'];
const TALENT_PAGE_SIZE = 12;
function useSiteCategories() {
  const [categories, setCategories] = useState({ departments, regions, medicalRoles:[] });
  useEffect(() => {
    let active = true;
    fetch('/api/categories', { headers:{ accept:'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('category lookup failed')))
      .then((result) => {
        if (!active) return;
        const groups = result.categories || {};
        const specialties = (groups.doctor_specialty || []).map((item) => item.name).filter(Boolean);
        const areas = (groups.region || []).map((item) => item.name).filter(Boolean);
        const roles = (groups.medical_role || []).map((item) => item.name).filter(Boolean);
        setCategories({ departments:['전체 진료과', ...(specialties.length ? specialties : departments.slice(1))], regions:['전국', ...(areas.length ? areas : regions.slice(1))], medicalRoles:roles });
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return categories;
}
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
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowCpu = Number.isFinite(navigator.hardwareConcurrency) && navigator.hardwareConcurrency <= 4;
  const lowMemory = Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 4;
  const dataSaver = Boolean(connection?.saveData);
  const slowNetwork = /^(slow-2g|2g|3g)$/.test(connection?.effectiveType || '');
  const reduced = prefersReduced || lowCpu || lowMemory || dataSaver || slowNetwork;
  const reasons = [
    prefersReduced && '시스템 동작 줄이기',
    lowCpu && '저사양 CPU',
    lowMemory && '메모리 절약',
    dataSaver && '데이터 절약 모드',
    slowNetwork && '느린 네트워크'
  ].filter(Boolean);
  document.documentElement.classList.remove('force-motion');
  document.documentElement.classList.toggle('performance-lite', reduced);
  document.documentElement.dataset.performance = reduced ? 'lite' : 'full';
  return { reduced, reasons };
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
    // 페이지 이동 시에는 즉시 최상단으로. smooth로 스르륵 올라가면 어지러움을 유발한다.
    if (!navigation.defaultPrevented) window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const currentPage = document.querySelector('.route-stage');
  if (reducedMotion || !currentPage) return commitNavigation();
  currentPage.classList.add('route-leaving');
  window.setTimeout(commitNavigation, 170);
}

function useAdaptivePerformance() {
  useEffect(() => {
    const update = () => getPerformanceProfile();
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
}

function trackConversion(event, detail = {}) {
  appendStoredRecord('medihelpers_conversion_events', {
    event,
    detail,
    path: getRoute(),
    createdAt: new Date().toISOString()
  }, 100);
}

// 로그인 여부를 서버(/api/account)로 확인하는 공용 훅. QA 프리뷰 모드는 미리보기 권한을 그대로 사용한다.
function useAuthGate(qa) {
  const [state, setState] = useState({ status: 'loading', role: '', isAdmin: false, isHospital: false });
  useEffect(() => {
    if (qa?.active) {
      const caps = qa.info.capabilities;
      setState({
        status: caps.signedIn ? 'member' : 'guest',
        role: caps.hospital ? 'hospital' : caps.doctor ? 'doctor' : '',
        isAdmin: Boolean(caps.admin),
        isHospital: Boolean(caps.hospital),
      });
      return undefined;
    }
    let active = true;
    fetch('/api/account', { credentials: 'same-origin', headers: { accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('account lookup failed'))))
      .then((result) => {
        if (!active) return;
        const signedIn = Boolean(result.signedIn || result.account);
        const role = result.account?.role || '';
        setState({
          status: signedIn ? 'member' : 'guest',
          role,
          isAdmin: Boolean(result.isAdmin),
          isHospital: role === 'hospital' || Boolean(result.isAdmin),
        });
      })
      .catch(() => active && setState({ status: 'guest', role: '', isAdmin: false, isHospital: false }));
    return () => { active = false; };
  }, [qa?.active, qa?.state]);
  return state;
}

// 비로그인/권한 부족 시 콘텐츠를 블러 처리하고 그 위에 로그인 유도 카드를 띄우는 게이트.
// 통째로 차단하지 않고 뒤 콘텐츠를 흐리게 보여줘 "무엇이 있는지" 맛보기 → 가입 동기를 살린다.
function AuthGate({ auth, need = 'member', title, description, children }) {
  if (auth.status === 'loading') {
    return <section className="auth-gate auth-gate-loading"><div className="auth-gate-card"><span className="auth-gate-spinner" aria-hidden="true" /><p>로그인 상태를 확인하고 있습니다…</p></div></section>;
  }
  const ok = need === 'hospital' ? (auth.isHospital || auth.isAdmin) : auth.status === 'member';
  if (ok) return children;
  const hospitalNeed = need === 'hospital';
  return <div className="auth-gate-wrap">
    <div className="auth-gate-blurred" aria-hidden="true">{children}</div>
    <div className="auth-gate-overlay">
      <div className="auth-gate-card">
        <span className="auth-gate-icon"><LockKeyhole /></span>
        <small>{hospitalNeed ? 'HOSPITAL MEMBERS ONLY' : 'MEMBERS ONLY'}</small>
        <h2>{title || (hospitalNeed ? '병원 회원 전용입니다' : '회원 전용입니다')}</h2>
        <p>{description || (hospitalNeed
          ? '의료진 인재정보 열람은 병원 회원에게만 제공됩니다. 병원 회원으로 로그인하거나 가입 후 이용해 주세요.'
          : '로그인 후 이용할 수 있는 화면입니다. 로그인하거나 회원가입 후 다시 시도해 주세요.')}</p>
        <div className="auth-gate-actions">
          <Link className="button primary" to={`/signup?next=${encodeURIComponent(getRoute())}`}><UserRound size={16} /> 로그인 · 회원가입</Link>
          {hospitalNeed && <Link className="button outline" to={`/signup/hospital?next=${encodeURIComponent(getRoute())}`}><Building2 size={16} /> 병원 회원가입</Link>}
        </div>
        <span className="auth-gate-note"><ShieldCheck size={14} /> 경쟁 업체의 무단 열람을 막기 위해 회원 인증 후 공개합니다.</span>
      </div>
    </div>
  </div>;
}

function Link({ to, className = '', children, onClick, ...anchorProps }) {
  return <a {...anchorProps} href={withBase(to)} className={className} onClick={(event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onClick?.();
    navigate(to);
  }}>{children}</a>;
}

function Modal({ children, onClose, wide = false, label = '상세 정보', variant = '', accent = '', embedded = false }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const closeTimerRef = useRef(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (embedded) return;
    if (closeTimerRef.current) return;
    if (motionIsReduced()) {
      onCloseRef.current();
      return;
    }
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => onCloseRef.current(), 240);
  }, [embedded]);

  useEffect(() => {
    if (embedded) return undefined;
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
  }, [embedded, requestClose]);

  const card = <div ref={dialogRef} className={`modal-card ${wide ? 'wide' : ''} ${variant} ${embedded ? 'embedded' : ''}`} style={accent ? { '--modal-accent': accent } : undefined} role={embedded ? undefined : 'dialog'} aria-modal={embedded ? undefined : 'true'} aria-label={label} tabIndex={embedded ? undefined : '-1'} data-lenis-prevent={!embedded || undefined}>
    {!embedded && <button className="modal-close" onClick={requestClose} aria-label="닫기"><X /></button>}
    <div className="modal-scroll" data-lenis-prevent={!embedded || undefined}>{children}</div>
  </div>;
  if (embedded) return <section className="job-detail-page">{card}</section>;
  return createPortal(<div className={`modal-backdrop ${closing ? 'is-closing' : ''}`} onPointerDown={(event) => event.target === event.currentTarget && requestClose()}>{card}</div>, document.body);
}

function Header({ path, qa, operations }) {
  const [open, setOpen] = useState(false);
  const accountLabel = qa.active ? qa.info.shortLabel : '로그인';
  const signedInPreview = qa.active && qa.info.capabilities.signedIn;
  const accountTarget = signedInPreview ? '/mypage' : qa.active ? '/qa-preview' : '/signup';
  const primaryAction = qa.active && qa.info.capabilities.admin
    ? { label: '관리자 모드', to: '/admin' }
    : qa.active && qa.info.capabilities.hospital
      ? { label: '마이페이지', to: '/mypage' }
      : qa.active && qa.info.capabilities.membership
        ? { label: '마이페이지', to: '/mypage' }
      : qa.active && qa.info.capabilities.doctor
          ? { label: '마이페이지', to: '/mypage' }
          : { label: '병원 회원가입', to: '/signup/hospital?next=/advertise' };
  return <header className="site-header">
    <div className="nav-wrap">
      <Link className="brand" to="/" onClick={() => setOpen(false)} aria-label="메디헬퍼스 홈">
        <img src={withBase('/medihelpers-logo.svg')} alt="메디헬퍼스" />
      </Link>
      <nav id="primary-navigation" className={open ? 'open' : ''}>
        {navItems.filter((item) => {
          if (item.path === '/resume' && !(qa.active && qa.info.capabilities.doctor)) return false;
          if (item.path === '/jobs' && operations.features.doctorRecruitment === false) return false;
          if (item.path === '/talent' && operations.features.talentSearch === false) return false;
          if (item.path === '/advertise' && operations.features.adRegistration === false) return false;
          return true;
        }).map((item) => <Link key={item.path} to={item.path} onClick={() => setOpen(false)} className={`${path === item.path ? 'active' : ''} ${item.path === '/advertise' ? 'nav-ad' : ''}`}>{item.label}</Link>)}
        <Link to="/qa-preview" onClick={() => setOpen(false)} className={`mobile-preview-link ${path === '/qa-preview' ? 'active' : ''}`}><ShieldCheck size={16} /> 권한 화면 미리보기</Link>
        <Link to={accountTarget} onClick={() => setOpen(false)} className={`mobile-account-link ${path === '/mypage' || path === '/qa-preview' || path.startsWith('/signup') ? 'active' : ''}`}>{signedInPreview ? '마이페이지' : qa.active ? `QA · ${accountLabel}` : '로그인·회원가입'}</Link>
      </nav>
      <div className="nav-actions">
        <Link className={`header-preview ${path === '/qa-preview' ? 'active' : ''}`} to="/qa-preview" aria-label="관리자·병원·일반회원·멤버십 권한 화면 미리보기"><ShieldCheck size={16} /> 화면 미리보기</Link>
        <Link className={`header-account ${qa.active ? `qa-account tone-${qa.info.tone}` : ''}`} to={accountTarget}><UserRound size={16} /> {accountLabel}</Link>
        <Link className="button primary compact" to={primaryAction.to}>{primaryAction.label}</Link>
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

function Footer({ operations }) {
  return <footer>
    <div className="footer-grid">
      <div className="footer-brand-block">
        <Link className="brand footer-logo" to="/"><img src={withBase('/medihelpers-logo.svg')} alt="메디헬퍼스" /></Link>
        <p>이직도 채용도 결국 사람의 일입니다.<br />메디헬퍼스가 직접 듣고, 꼼꼼히 연결하겠습니다.</p>
        <div className="footer-contact"><a href={`tel:${operations.settings.supportPhone.replace(/\D/g,'')}`}><Phone size={15} /> {operations.settings.supportPhone}</a><a href={`mailto:${operations.settings.supportEmail}`}><Mail size={15} /> {operations.settings.supportEmail}</a></div>
      </div>
      <div className="footer-column"><strong>의사</strong><Link to="/jobs">초빙정보</Link><Link to="/resume">이력서 등록</Link><Link to="/headhunting">비공개 이직 상담</Link></div>
      <div className="footer-column"><strong>병원</strong><Link to="/talent">의사 인재정보</Link><Link to="/headhunting">의사 채용 의뢰</Link><Link to="/advertise">광고센터</Link></div>
      <div className="footer-column"><strong>안내</strong><Link to="/medical-staff">의료인 채용</Link><Link to="/signup">로그인·회원가입</Link><Link to="/terms">이용약관</Link><Link to="/privacy">개인정보처리방침</Link></div>
    </div>
    <div className="footer-bottom"><span>© 2026 MEDIHELPERS. 대표 이형석 · 사업자등록번호 873-92-00515 · 직업정보제공사업 부산북부지청 제2017-1호</span><span>부산광역시 북구 만덕대로116번길 28</span></div>
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
  if (!hasBrandAsset) return null;
  const mood = getHospitalMood(job);
  return <span className={`hospital-logo ${prominent ? 'prominent' : ''} has-image logo-fit-${brandFit} ${job.brandAsset ? `brand-asset-${job.brandAsset}` : ''}`} style={{ '--logo-color': mood.primary }}>
    {job.brandAsset === 'bluecare' ? <span className="bluecare-brand" aria-label={`${job.hospital} 예시 로고`}><i className="bluecare-symbol"><b /><em /></i><span><strong>블루케어</strong><small>BLUECARE MEDICAL CENTER</small></span></span> : <img src={brandUrl} alt={`${job.hospital} ${brandFit === 'banner' ? '배너' : '로고'}`} loading="lazy" decoding="async" />}
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

function JobCard({
  job,
  saved,
  onSave,
  onOpen,
  preview = false,
  qa,
  variant = "",
}) {
  const isAd = Boolean(job.adTier);
  // 채용 목록에서는 장식 배너보다 병원 로고를 우선해 브랜드를 또렷하게 보여준다.
  const brandSource = job.logo || job.cardBanner || job.banner;
  const brandUrl = brandSource ? withBase(brandSource) : "";
  const brandFit = job.brandFit
    ? job.brandFit
    : job.logo
      ? "mark"
      : job.cardBanner
      ? "banner"
      : job.banner
        ? "banner"
        : "mark";
  const hasBrandAsset = Boolean(brandSource || job.brandAsset);
  const mood = getHospitalMood(job);
  const restricted = isAd || job.badge === "비공개";
  const qaUnlocked =
    restricted && qa?.active && qa.info.capabilities.privateDetails;
  const moveCardLight = (event) => {
    if (
      !isAd ||
      event.pointerType === "touch" ||
      document.documentElement.classList.contains("performance-lite")
    )
      return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    event.currentTarget.style.setProperty("--pointer-x", `${x * 100}%`);
    event.currentTarget.style.setProperty("--pointer-y", `${y * 100}%`);
    event.currentTarget.style.setProperty("--tilt-x", `${(0.5 - y) * 1.8}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${(x - 0.5) * 1.8}deg`);
  };
  const resetCardLight = (event) => {
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
  };
  return (
    <article
      className={`job-card ${variant ? `job-card-${variant}` : ""} ${preview ? "advertisement-preview-card" : ""} ${isAd ? `premium-ad ad-${job.adTier} ${hasBrandAsset ? "has-brand-logo" : "has-brand-wordmark"} ${brandFit === "banner" ? "has-brand-banner" : ""}` : ""}`}
      style={isAd ? hospitalMoodStyle(job) : { "--job-color": job.color }}
      data-brand-mood={isAd ? mood.id : undefined}
      onPointerMove={moveCardLight}
      onPointerLeave={resetCardLight}
    >
      <button
        className="card-hit-area"
        onClick={onOpen}
        aria-label={
          preview
            ? "집중채용 광고 디자인 예시 신청하기"
            : `${job.hospital} ${job.title} 상세보기`
        }
      />
      <div className="job-top">
        <div>
          <span
            className="tag"
            style={{
              color: isAd ? mood.primary : job.color,
              background: `${isAd ? mood.primary : job.color}12`,
            }}
          >
            {job.badge}
          </span>
          {isAd && (
            <span
              className={
                job.isDemo ? "sponsored-label demo-label" : "sponsored-label"
              }
            >
              {job.isDemo ? "DEMO · 가상 공고" : "AD · 병원 브랜드 광고"}
            </span>
          )}
        </div>
        {preview ? (
          <span className="preview-card-label">SAMPLE</span>
        ) : (
          <button
            className={saved ? "heart saved" : "heart"}
            onClick={(event) => {
              event.stopPropagation();
              onSave();
            }}
            aria-label="관심 공고 저장"
          >
            <Heart size={20} fill={saved ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      {isAd ? (
        <div
          className={`ad-brand-stage ${hasBrandAsset ? `logo-stage media-${brandFit}` : "wordmark-stage"}`}
          style={
            brandSource ? { "--brand-image": `url(${brandUrl})` } : undefined
          }
        >
          {hasBrandAsset ? (
            <>
              <span className="brand-media-backdrop" aria-hidden="true" />
              <HospitalLogo
                job={job}
                prominent
                source={brandSource}
                fit={brandFit}
              />
              <div className="ad-hospital-caption">
                <strong>{job.hospital}</strong>
                <small>
                  {job.logoDesignSample
                    ? "광고 디자인 예시 · 공식 로고 아님"
                    : "병원 브랜드 채용관"}
                </small>
              </div>
            </>
          ) : (
            <div className="hospital-wordmark">
              <strong>{job.hospital}</strong>
            </div>
          )}
        </div>
      ) : (
        <div className={`${variant === "compact" ? "listing-brand-stage" : "job-hospital"} ${hasBrandAsset ? "has-brand-asset" : "no-brand-asset"}`}>
          <HospitalLogo job={job} prominent={variant === "compact"} />
          <span className="listing-brand-name">
            <strong>{job.hospital}</strong>
            {variant === "compact" && <small>{job.facilityType}</small>}
          </span>
        </div>
      )}
      <h3>{job.title}</h3>
      <div className="meta">
        <span>
          <MapPin size={15} />
          {job.location}
        </span>
        <span>
          <CalendarDays size={15} />
          ~ {job.deadline || "마감일 협의"}
        </span>
      </div>
      <div className="job-bottom">
        <span>{job.dept}</span>
        <strong
          className={
            restricted && !qaUnlocked
              ? "premium-value"
              : qaUnlocked
                ? "qa-card-unlocked"
                : ""
          }
        >
          {restricted && !qaUnlocked ? (
            <>
              <LockKeyhole /> 의사 인증 상세
            </>
          ) : qaUnlocked ? (
            <>
              <ShieldCheck /> {job.pay}
            </>
          ) : (
            job.pay
          )}
        </strong>
      </div>
      <button
        className="card-action"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
      >
        {preview ? "이 디자인으로 광고하기" : "공고 자세히 보기"}{" "}
        <ArrowRight size={16} />
      </button>
    </article>
  );
}
function PhotoLightbox({ photos, index, hospital, onIndex, onClose }) {
  const thumbnailRefs = useRef([]);
  const total = photos.length;
  const previous = useCallback(() => onIndex((index - 1 + total) % total), [index, onIndex, total]);
  const next = useCallback(() => onIndex((index + 1) % total), [index, onIndex, total]);

  useEffect(() => {
    if (embedded) return undefined;
    const onKeyDown = (event) => {
      if (!['Escape', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [next, onClose, previous]);

  useEffect(() => {
    thumbnailRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [index]);

  return createPortal(<div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`${hospital} 시설 사진 보기`} onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="photo-lightbox-shell" data-lenis-prevent>
      <header><div><strong>{hospital}</strong><span>시설 사진</span></div><b>{index + 1} / {total}</b><button type="button" className="photo-lightbox-close" onClick={onClose} aria-label="사진 보기 닫기"><X /></button></header>
      <div className="photo-lightbox-stage">
        {total > 1 && <button type="button" className="photo-lightbox-arrow previous" onClick={previous} aria-label="이전 사진"><ChevronLeft /></button>}
        <img src={photos[index]} alt={`${hospital} 시설 ${index + 1}`} />
        {total > 1 && <button type="button" className="photo-lightbox-arrow next" onClick={next} aria-label="다음 사진"><ChevronRight /></button>}
      </div>
      <footer><span>← → 방향키로 이동 · ESC로 닫기</span><div className="photo-lightbox-thumbnails" aria-label="병원 사진 미리보기">
        {photos.map((photo, photoIndex) => <button type="button" key={`${photo}-${photoIndex}`} ref={(element) => { thumbnailRefs.current[photoIndex] = element; }} className={photoIndex === index ? 'active' : ''} onClick={() => onIndex(photoIndex)} aria-label={`${photoIndex + 1}번 사진 보기`} aria-current={photoIndex === index ? 'true' : undefined}><img src={photo} alt="" /></button>)}
      </div></footer>
    </div>
  </div>, document.body);
}

function JobDetail({ job, saved, onSave, onClose, qa, page = false }) {
  const [photoIndex, setPhotoIndex] = useState(null);
  const [verifiedDoctor, setVerifiedDoctor] = useState(Boolean(qa?.active && (qa.info.capabilities.doctor || qa.info.capabilities.admin)));
  useEffect(() => {
    if (qa?.active) {
      setVerifiedDoctor(Boolean(qa.info.capabilities.doctor || qa.info.capabilities.admin));
      return undefined;
    }
    let active = true;
    fetch('/api/account', { credentials:'same-origin', headers:{ accept:'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('account')))
      .then((result) => { if (active) setVerifiedDoctor(Boolean(result.signedIn && result.account?.role === 'doctor')); })
      .catch(() => { if (active) setVerifiedDoctor(false); });
    return () => { active = false; };
  }, [qa?.active, qa?.state]);
  const isAd = Boolean(job.adTier);
  // 병원이 비용을 낸 광고 공고는 널리 알리는 것이 목적이므로 급여·조건을 공개한다.
  // 비공개 헤드헌팅 포지션(badge === "비공개")만 상담 후 공개 대상으로 잠근다.
  const restricted = job.badge === "비공개";
  // 메디게이트 방식: 로그인한 의사 회원이면 급여·상세조건 열람(멤버십 결제 불필요).
  // 비회원은 잠금(가입 유도). QA 프리뷰는 doctor/membership/admin 권한으로 판정.
  const memberUnlocked = qa?.active
    ? Boolean(qa.info.capabilities.doctor || qa.info.capabilities.membership || qa.info.capabilities.admin)
    : verifiedDoctor;
  const membershipTarget = verifiedDoctor
    ? `/membership?type=doctor&job=${job.id}`
    : `/signup/doctor?next=/membership?type=doctor&job=${job.id}`;
  const qaUnlocked =
    restricted && memberUnlocked;
  const locked = restricted && !qaUnlocked;
  const mapUrl = `https://map.naver.com/p/search/${encodeURIComponent(`${job.hospital} ${job.location}`)}`;
  const hospitalPhotos = job.hospitalPhotos || [];
  const institutionFacts = [
    ["기관명", job.institutionName || job.hospital],
    ["주소", job.fullAddress || job.location],
    ["홈페이지", job.website],
    ["진료과목", job.specialties || job.focus],
    [
      "대표자 및 사업자 번호",
      [job.representative, job.businessNumber].filter(Boolean).join(" · "),
    ],
    ["근무 의사 수", job.doctorCount],
    ["수술 및 외래건수(일)", job.dailyVolume],
    ["개원연도", job.established],
    ["재직인원", job.staffCount],
    ["의료설비", job.equipment],
    ["병상 및 입원 환자", job.beds],
  ].filter(([, value]) => value);
  const benefitsText = job.benefits?.join(" · ") || "병원 확인 필요";
  const doctorDecisionGroups = [
    {
      title: "보수·계약",
      icon: Banknote,
      rows: [
        ["공개 급여", job.pay],
        [
          "급여 기준",
          job.pay.includes("협의")
            ? "경력·진료범위에 따라 협의"
            : "공고 기준 · Net/세전 여부 최종 확인",
        ],
        [
          "인센티브",
          job.benefits?.find((item) => item.includes("인센티브")) ||
            "적용 여부 병원 확인 필요",
        ],
        ["퇴직금·계약기간", "별도 지급 및 계약기간 병원 확인 필요"],
      ],
    },
    {
      title: "실제 근무표",
      icon: CalendarDays,
      rows: [
        ["평일·주말 시간", job.workHours || job.schedule],
        ["주당 근무", job.schedule],
        ["휴무·연차", job.daysOff || "병원 확인 필요"],
        [
          "당직·온콜",
          job.benefits?.find((item) => item.includes("당직")) ||
            (job.summary?.includes("야간 진료 없이")
              ? "야간 진료 없음"
              : "횟수·수당 병원 확인 필요"),
        ],
      ],
    },
    {
      title: "진료 강도",
      icon: Stethoscope,
      rows: [
        ["주요 진료범위", job.focus],
        ["일평균 환자·검사", job.dailyVolume || "병원 확인 필요"],
        ["시술·검사 비중", job.equipment ? `${job.equipment} 활용` : "병원 확인 필요"],
        [
          "지원 인력",
          [job.doctorCount, job.staffCount].filter(Boolean).join(" · ") ||
            "간호·보조 인력 구성 확인 필요",
        ],
      ],
    },
    {
      title: "입사 판단",
      icon: ShieldCheck,
      rows: [
        ["채용 사유", job.recruitmentReason || "진료 인력 충원"],
        ["복리후생", benefitsText],
        ["입사 시점", "합격 후 협의"],
        ["면접 절차", "서류 확인 → 병원 면담 → 조건 조율"],
      ],
    },
  ];
  return (
    <Modal
      onClose={onClose}
      wide
      embedded={page}
      variant="job-detail"
      accent={job.color}
      label={`${job.hospital} 채용공고 상세 정보`}
    >
      {page && <nav className="detail-page-nav" aria-label="공고 상세 위치"><Link to="/jobs"><ArrowLeft /> 전체 채용정보</Link><span>채용정보</span><b>{job.hospital}</b></nav>}
      <div className="detail-heading" style={{ "--job-color": job.color }}>
        <div className="detail-brand">
          <HospitalLogo job={job} prominent />
          <div>
            <div className="detail-brand-label">
              <span
                className="tag"
                style={{ color: job.color, background: `${job.color}12` }}
              >
                {job.badge}
              </span>
              {isAd && <span>AD · 병원 브랜드 채용관</span>}
              {qaUnlocked && (
                <span className="qa-unlocked-badge">
                  <ShieldCheck /> QA 잠금 해제
                </span>
              )}
            </div>
            <strong>{job.hospital}</strong>
            <small>
              <BadgeCheck /> 등록된 기관 정보
            </small>
          </div>
        </div>
        <h2>{job.title}</h2>
        <div className="meta large">
          <span>
            <MapPin size={17} />
            {job.location}
          </span>
          <span>
            <Clock3 size={17} />
            {job.schedule}
          </span>
          <span>
            <CalendarDays size={17} />
            {job.deadline} 마감
          </span>
        </div>
      </div>
      <div className="detail-grid">
        <div className="detail-content">
          <section className="job-recruitment-overview">
            <div className="detail-section-title">
              <span><FileCheck2 /></span>
              <div><small>RECRUITMENT OVERVIEW</small><h3>모집개요</h3></div>
            </div>
            <dl>
              <div><dt>초빙과목</dt><dd>{job.dept}</dd></div>
              <div><dt>초빙유형</dt><dd>{job.type}</dd></div>
              <div><dt>구인사유</dt><dd>{job.recruitmentReason || "진료 인력 충원"}</dd></div>
              <div><dt>급여수준</dt><dd>{locked ? "의사 인증 후 무료 공개" : job.pay}</dd></div>
              <div><dt>근무시간</dt><dd>{locked ? job.schedule : job.workHours || job.schedule}</dd></div>
              <div><dt>휴무</dt><dd>{locked ? "의사 인증 후 무료 공개" : job.daysOff || "협의"}</dd></div>
            </dl>
            <div className="recruitment-deadline"><CalendarDays /><span><small>공고 모집기간</small><strong>2026.07.17 ~ {job.deadline}</strong></span><Link to={`/request/job-seeker?job=${job.id}`}>무료 구직상담 신청 <ArrowRight /></Link></div>
          </section>
          <section className={`doctor-decision-sheet ${memberUnlocked ? "is-unlocked" : "is-locked"}`}>
            <div className="decision-sheet-head">
              <div className="detail-section-title">
                <span><Crown /></span>
                <div><small>VERIFIED DOCTOR DETAILS</small><h3>채용공고 상세조건</h3></div>
              </div>
              <span className="decision-sheet-status">
                {memberUnlocked ? <><BadgeCheck /> 상세정보 열람 중</> : <><LockKeyhole /> 로그인 후 열람</>}
              </span>
            </div>
            <p className="decision-sheet-intro">
              공개 요약보다 구체적인 보수 구조, 실제 근무표, 진료 범위와 입사 조건을 한 화면에서 확인합니다.
            </p>
            <div className="decision-sheet-grid">
              {doctorDecisionGroups.map(({ title, icon: Icon, rows }) => (
                <article key={title}>
                  <header><span><Icon /></span><strong>{title}</strong></header>
                  <dl>
                    {rows.map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{memberUnlocked ? value : <span className="masked-detail" aria-label="로그인 후 공개">로그인 후 공개</span>}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
              {!memberUnlocked && (
                <div className="decision-sheet-lock-overlay">
                  <span><LockKeyhole /></span>
                  <small>MEMBERS ONLY</small>
                  <strong>로그인 후 상세조건 열람</strong>
                  <p>보수·실제 근무표·진료 강도·입사 판단 정보가 의사 회원에게 모두 공개됩니다.</p>
                  <Link className="button primary" to={`/signup/doctor?next=${encodeURIComponent(`/jobs/${job.id}`)}`}>로그인 · 회원가입 <ArrowRight /></Link>
                </div>
              )}
            </div>
            {memberUnlocked && (
              <div className="headhunter-verified-note">
                <span><BadgeCheck /></span>
                <div>
                  <small>HEADHUNTER CHECK NOTE</small>
                  <strong>공고 등록정보와 공개 조건을 기준으로 정리했습니다</strong>
                  <p>{job.summary} 환자 수·당직 수당처럼 ‘확인 필요’로 표시된 항목은 지원 전 담당자가 병원에 다시 확인합니다.</p>
                </div>
                <Link to={`/headhunting?job=${job.id}`}>조건 확인·협상 요청 <ArrowRight /></Link>
              </div>
            )}
          </section>
          <section className="hospital-profile">
            <div className="detail-section-title">
              <span>
                <Building2 />
              </span>
              <div>
                <small>HOSPITAL PROFILE</small>
                <h3>병원 정보</h3>
              </div>
            </div>
            <p>{job.summary}</p>
            <div className="institution-profile-layout">
              <div className="hospital-photo-gallery">
                {hospitalPhotos.length > 0 ? (
                  hospitalPhotos.slice(0, 6).map((photo, index) => (
                    <button
                      type="button"
                      key={photo}
                      className={index === 0 ? "primary-photo" : ""}
                      onClick={() => setPhotoIndex(index)}
                      aria-label={`${job.hospital} 병원 사진 ${index + 1} 크게 보기`}
                    >
                      <img
                        src={photo}
                        alt={`${job.hospital} 시설 ${index + 1}`}
                        loading="lazy"
                      />
                    </button>
                  ))
                ) : (
                  <div className="photo-gallery-empty">
                    <Building2 />
                    <span>등록된 병원 사진이 없습니다</span>
                  </div>
                )}
              </div>
              <dl className="institution-facts">
                {institutionFacts.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>
                      {label === "홈페이지" ? (
                        <a href={value} target="_blank" rel="noreferrer">
                          {value}
                        </a>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
          <section className="location-panel">
            <div className="location-icon">
              <MapPin />
            </div>
            <div>
              <small>근무지 위치</small>
              <strong>{job.location}</strong>
              <p>{job.access}</p>
            </div>
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`${job.hospital} 지도에서 위치 보기`}
            >
              지도에서 보기 <ArrowRight />
            </a>
          </section>
          <section>
            <div className="detail-section-title compact">
              <span>
                <BriefcaseBusiness />
              </span>
              <div>
                <small>POSITION DETAILS</small>
                <h3>포지션과 근무조건</h3>
              </div>
            </div>
            <p>{job.summary}</p>
            <div className="job-detail-copy">
              <div><h4>근무조건</h4><p>급여조건은 {job.pay}이며, 근무시간은 {job.workHours || job.schedule}입니다. {job.daysOff || "휴무일은 상담을 통해 조율합니다."}</p></div>
              <div><h4>업무내용</h4><p>{job.focus} 업무를 중심으로 진료합니다. 세부 진료범위와 환자 수, 시술·검사 범위는 헤드헌터가 병원과 확인해 안내합니다.</p></div>
              <div><h4>복리후생·협의사항</h4><p>{job.benefits.join(" · ")} 조건을 제공하며 경력과 담당 진료범위에 따라 세부 내용을 조율합니다.</p></div>
            </div>
            <div className="benefit-list">
              {job.benefits.map((item) => (
                <span key={item}>
                  <Check size={15} />
                  {item}
                </span>
              ))}
            </div>
          </section>
        </div>
        <aside
          className={
            restricted ? `premium-aside ${qaUnlocked ? "qa-unlocked" : ""}` : ""
          }
        >
          {locked ? (
            <>
              <span>예상 보수</span>
              <div className="locked-value">
                <div className="free-preview">
                  <small>무료 미리보기 완료</small>
                  <strong>지역 · 진료과 · 근무형태 확인</strong>
                </div>
                <div className="locked-list">
                  <span>
                    <LockKeyhole /> 상세 급여와 인센티브
                  </span>
                  <span>
                    <LockKeyhole /> 정확한 근무시간·당직
                  </span>
                  <span>
                    <LockKeyhole /> 채용 담당자와 협의조건
                  </span>
                  <span>
                    <LockKeyhole /> 환자량·시술·검사 범위
                  </span>
                  <span>
                    <LockKeyhole /> 간호·보조 인력 구성
                  </span>
                  <span>
                    <LockKeyhole /> 채용 사유·면접 절차
                  </span>
                </div>
                <Link
                  className="button primary full"
                  to={`/signup/doctor?next=/jobs/${job.id}`}
                  onClick={() =>
                    trackConversion("job_unlock_cta", {
                      jobId: job.id,
                      offer: "verified_doctor_free",
                    })
                  }
                >
                  의사 인증하고 무료 열람
                </Link>
                <small className="value-hint">
                  열람료 없이 상세조건과 상담을 이용할 수 있어요.
                </small>
              </div>
            </>
          ) : (
            <>
              <span>{qaUnlocked ? "QA 공개 상세조건" : "예상 보수"}</span>
              <strong>{job.pay}</strong>
              {qaUnlocked && (
                <div className="qa-unlocked-list">
                  <span>
                    <Check /> 인센티브 별도 협의
                  </span>
                  <span>
                    <Check /> 당직·근무시간 확인 가능
                  </span>
                  <span>
                    <Check /> 담당 헤드헌터 연결 가능
                  </span>
                </div>
              )}
              <small>경력과 진료 범위에 따라 조율합니다.</small>
              <Link
                className="button primary full"
                to={`/headhunting?job=${job.id}`}
              >
                {qaUnlocked ? "헤드헌터와 조건 확인" : "비공개 상담 신청"}
              </Link>
            </>
          )}
          <button className="button outline full" onClick={onSave}>
            <Heart size={17} fill={saved ? "currentColor" : "none"} />{" "}
            {saved ? "관심공고 저장됨" : "관심공고 저장"}
          </button>
        </aside>
      </div>
      {photoIndex !== null && <PhotoLightbox photos={hospitalPhotos} index={photoIndex} hospital={job.hospital} onIndex={setPhotoIndex} onClose={() => setPhotoIndex(null)} />}
    </Modal>
  );
}

function JobDetailRoute({ job, qa }) {
  const [saved, setSaved] = useState(() => readStoredArray('medihelpers_saved_jobs').includes(job.id));
  const toggleSaved = () => {
    const current = readStoredArray('medihelpers_saved_jobs');
    const next = current.includes(job.id) ? current.filter((id) => id !== job.id) : [...current, job.id];
    writeStoredValue('medihelpers_saved_jobs', next);
    syncSavedToServer(job.id, 'job');
    setSaved(next.includes(job.id));
  };
  return <JobDetail job={job} qa={qa} page saved={saved} onSave={toggleSaved} onClose={() => navigate('/jobs')} />;
}

function ConsultationForm({ initialRole = 'doctor', initialContext = '', initialProfession = '', initialTopic = '' }) {
  const [role, setRole] = useState(initialRole);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const professionName = initialProfession === 'doctor' ? '의사' : '';
  const [data, setData] = useState({ topic: initialTopic || (initialContext ? '특정 공고 문의' : ''), department: professionName, region: '', workType: '', message: '', name: '', phone: '', contactMethod: '전화', contactTime: '상관없음' });
  const accountProfile = useAccountProfile();
  // 로그인 회원이면 이름·연락처를 회원정보로 자동 채운다(사용자가 아직 입력하지 않은 값만).
  useEffect(() => {
    if (!accountProfile.loaded) return;
    const preName = accountProfile.role === 'hospital' ? (accountProfile.organization || accountProfile.name) : accountProfile.name;
    setData((current) => ({
      ...current,
      name: current.name || preName || '',
      phone: current.phone || accountProfile.phone || '',
    }));
  }, [accountProfile.loaded]);
  const topics = role === 'doctor' ? ['이직 가능성 확인', '비공개 포지션', '급여·근무조건 상담', '특정 공고 문의'] : ['채용공고 등록', '의사 추천', '급여·채용조건 설계', '긴급 채용'];
  const workTypes = role === 'doctor' ? ['주 4일', '주 4.5일', '주 5일', '협의 가능'] : ['정규직', '파트타임', '당직·대진', '협의 가능'];
  const update = (key, value) => setData((current) => ({ ...current, [key]: value }));
  const changeRole = (nextRole) => {
    setRole(nextRole);
    setStep(1);
    setData((current) => ({ ...current, topic: '', workType: '' }));
  };
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    const message = [`상담 유형: ${data.topic}`, initialContext ? `문의 대상: ${initialContext}` : '', data.message].filter(Boolean).join('\n');
    const payload = { phone:data.phone, specialty:data.department, region:data.region, workType:data.workType, contactTime:data.contactTime, message };
    if (role === 'doctor') payload.name = data.name;
    else payload.hospital = data.name;
    try {
      const response = await fetch('/api/consultations', { method:'POST', credentials:'same-origin', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ requestType:role, payload }) });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        navigate(`/account?next=${encodeURIComponent('/headhunting')}`);
        return;
      }
      if (!response.ok) throw new Error(result.error || '상담 요청을 저장하지 못했습니다.');
      appendStoredRecord('medihelpers_consultations', { id:result.id, role, context:initialContext, profession:initialProfession, status:'new', createdAt:new Date().toISOString(), ...data });
      trackConversion('consultation_submit', { role, topic:data.topic, context:initialContext });
      setSubmitted(result.id);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };
  if (submitted) return <div className="consult-success"><span><CircleCheck /></span><small>상담번호 {submitted}</small><h3>상담 요청을 정확히 접수했습니다</h3><p>담당 헤드헌터가 내용을 먼저 검토한 뒤 선택하신 방식으로 연락드립니다.</p><div className="consult-next"><span><b>1</b>상담 접수</span><i /><span><b>2</b>내용 검토</span><i /><span><b>3</b>담당자 연락</span></div><a className="button outline" href="tel:0513425463"><Phone /> 급하면 전화로 문의</a></div>;
  return <form className="consult-form guided" onSubmit={submit}>
    <div className="guided-head"><div><small>간편 1:1 상담</small><h3>{role === 'doctor' ? '내 조건에 맞는 이직 상담' : '우리 병원에 맞는 채용 상담'}</h3></div><span>약 1~2분</span></div>
    <div className="consult-progress" aria-label={`상담 ${step}단계`}><div className={step >= 1 ? 'active' : ''}><b>1</b><span>상담 목적</span></div><i /><div className={step >= 2 ? 'active' : ''}><b>2</b><span>필수 조건</span></div><i /><div className={step >= 3 ? 'active' : ''}><b>3</b><span>연락 방법</span></div></div>
    {step === 1 && <div className="consult-step"><div className="role-tabs"><button type="button" className={role === 'doctor' ? 'active' : ''} onClick={() => changeRole('doctor')}><Stethoscope /> 의사</button><button type="button" className={role === 'hospital' ? 'active' : ''} onClick={() => changeRole('hospital')}><Building2 /> 병원</button></div><div className="step-question"><small>하나만 선택해주세요</small><h4>어떤 상담이 필요하신가요?</h4></div><div className="choice-grid">{topics.map((topic) => <button type="button" key={topic} className={data.topic === topic ? 'selected' : ''} onClick={() => update('topic', topic)}><span>{topic}</span>{data.topic === topic && <Check />}</button>)}</div><button type="button" className="button primary full" disabled={!data.topic} onClick={() => setStep(2)}>다음 · 필요한 조건 입력 <ArrowRight /></button></div>}
      {step === 2 && <div className="consult-step"><div className="step-question"><small>{data.topic}</small><h4>꼭 필요한 조건만 알려주세요</h4><p>정확하지 않아도 괜찮습니다. 담당자가 함께 정리해드려요.</p></div><div className="form-grid"><label><span>{role === 'doctor' ? '진료과·전문과목' : '채용 진료과·전문과목'} *</span><input value={data.department} onChange={(e) => update('department', e.target.value)} placeholder="예: 소화기내과, 정형외과 전문의" autoFocus /></label><label><span>{role === 'doctor' ? '희망 지역' : '병원 지역'}</span><input value={data.region} onChange={(e) => update('region', e.target.value)} placeholder="예: 부산·경남" /></label></div><div className="field-group"><span>{role === 'doctor' ? '희망 근무형태' : '채용 형태'}</span><div className="choice-row">{workTypes.map((item) => <button type="button" key={item} className={data.workType === item ? 'selected' : ''} onClick={() => update('workType', item)}>{item}</button>)}</div></div><label className="wide-field"><span>추가로 전하고 싶은 내용 <i>선택</i></span><textarea value={data.message} onChange={(e) => update('message', e.target.value)} rows="3" placeholder={role === 'doctor' ? '희망 보수나 피하고 싶은 조건을 적어주세요.' : '채용 일정이나 꼭 필요한 경력을 적어주세요.'} /></label><div className="step-actions"><button type="button" className="button outline" onClick={() => setStep(1)}><ArrowLeft /> 이전</button><button type="button" className="button primary" disabled={!data.department.trim()} onClick={() => setStep(3)}>다음 · 연락 방법 <ArrowRight /></button></div></div>}
    {step === 3 && <div className="consult-step"><div className="step-question"><small>마지막 단계</small><h4>어떻게 연락드리면 편하신가요?</h4></div><div className="form-grid"><label><span>{role === 'doctor' ? '성함' : '병원명'} *</span><input required value={data.name} onChange={(e) => update('name', e.target.value)} placeholder={role === 'doctor' ? '성함을 입력해주세요' : '병원명을 입력해주세요'} autoFocus /></label><label><span>연락처 *</span><input required value={data.phone} onChange={(e) => update('phone', e.target.value)} type="tel" placeholder="010-0000-0000" /></label></div><div className="contact-preference"><div><span>연락 방법</span><div className="choice-row">{['전화', '문자'].map((item) => <button type="button" key={item} className={data.contactMethod === item ? 'selected' : ''} onClick={() => update('contactMethod', item)}>{item}</button>)}</div></div><div><span>연락 시간</span><div className="choice-row">{['오전', '오후', '저녁', '상관없음'].map((item) => <button type="button" key={item} className={data.contactTime === item ? 'selected' : ''} onClick={() => update('contactTime', item)}>{item}</button>)}</div></div></div><div className="consult-summary"><small>상담 내용 확인</small><dl><div><dt>상담</dt><dd>{data.topic}</dd></div><div><dt>조건</dt><dd>{data.department}{data.region ? ` · ${data.region}` : ''}{data.workType ? ` · ${data.workType}` : ''}</dd></div><div><dt>연락</dt><dd>{data.contactMethod} · {data.contactTime}</dd></div></dl></div><label className="consent"><input type="checkbox" required name="privacy" value="agreed" /><span>상담을 위한 개인정보 수집·이용에 동의합니다. 입력 정보는 상담 목적으로만 사용됩니다.</span></label>{submitError && <p className="consult-submit-error">{submitError}</p>}<div className="step-actions"><button type="button" className="button outline" onClick={() => setStep(2)}><ArrowLeft /> 이전</button><button className="button primary" type="submit" disabled={submitting}>{submitting ? '접수 중…' : '무료 상담 접수'} <ArrowRight /></button></div><p className="form-note"><ShieldCheck /> 의사의 이직 의사와 상담 내용은 동의 없이 병원에 공개하지 않습니다.</p></div>}
  </form>;
}

function QuickAccess() {
  return <section className="home-role-actions" aria-label="의사와 병원 빠른 메뉴">
    <Link className="role-action doctor-action" to="/request/job-seeker">
      <span className="role-action-icon"><MessageCircle /></span><div><small>의료인 · 무료</small><strong>구직희망 조건 간편 등록</strong><p>희망 지역·근무형태를 남기면 헤드헌터가 연락드립니다.</p></div><span className="role-arrow">무료 접수 <ArrowRight /></span>
    </Link>
    <Link className="role-action hospital-action" to="/request/hiring">
      <span className="role-action-icon"><Building2 /></span><div><small>병원 · 무료</small><strong>구인희망 조건 간편 등록</strong><p>초빙과목·보수·일정을 남기면 헤드헌터가 연락드립니다.</p></div><span className="role-arrow">무료 접수 <ArrowRight /></span>
    </Link>
  </section>;
}

function MemberTeaser() {
  return <section className="member-teaser"><div className="member-icon"><Crown /></div><div><small>VERIFIED DOCTOR BENEFIT</small><h2>상세조건과 헤드헌터 상담은 의사 인증 후 무료</h2><p>유료 서비스는 정보 잠금 해제가 아니라 맞춤 알림, 우선 상담 예약, 연봉·계약 분석처럼 이직 준비 시간을 줄이는 기능에 집중합니다.</p></div><Link className="button dark" to="/membership">선택 서비스 보기 <ArrowRight /></Link></section>;
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
function HomePage({ liveJobs = jobs }) {
  const siteCategories = useSiteCategories();
  const [recruitmentType, setRecruitmentType] = useState('전체 초빙');
  const [dept, setDept] = useState('전체 진료과');
  const [region, setRegion] = useState('전국');
  const search = () => navigate(`/jobs?recruitmentType=${encodeURIComponent(recruitmentType)}&dept=${encodeURIComponent(dept)}&region=${encodeURIComponent(region)}`);
  return <>
    <section className="home-job-hub">
      <div className="home-job-hub-inner">
        <div className="home-job-hub-head"><div><span className="section-kicker">DOCTOR RECRUITMENT</span><h1>의사 초빙정보</h1></div><p>진료과와 지역, 근무형태를 선택하면 원하는 공고를 바로 확인할 수 있습니다.</p></div>
        <div className="hero-search-card" role="search" aria-label="의사 초빙정보 검색">
          <div className="hero-search-title"><span><Search /></span><div><strong>의사 초빙정보 바로 찾기</strong><small>초빙유형·진료과·지역을 선택하세요</small></div><em className="hero-search-badge">의사 전용</em></div>
          <div className="hero-search-fields">
            <label><small>초빙 유형</small><span><BriefcaseBusiness size={19} /><HeroSelect label="초빙 유형" value={recruitmentType} onChange={setRecruitmentType} options={recruitmentTypes} /></span></label>
            <label><small>진료과</small><span><Stethoscope size={19} /><HeroSelect label="진료과" value={dept} onChange={setDept} options={siteCategories.departments} /></span></label>
            <label><small>지역</small><span><MapPin size={19} /><HeroSelect label="지역" value={region} onChange={setRegion} options={siteCategories.regions} /></span></label>
            <button className="hero-search-button" onClick={search}>의사 초빙정보 보기 <ArrowRight /></button>
          </div>
          <div className="popular-searches"><span>많이 찾는 조건</span><Link to="/jobs?keyword=주%204일">주 4일</Link><Link to="/jobs?keyword=검진센터">검진센터</Link><Link to="/jobs?region=서울">서울</Link><Link to="/jobs?region=부산">부산</Link></div>
        </div>
      </div>
    </section>
    <section className="section soft home-job-feed" id="featured-jobs"><div className="section-head"><div><span className="section-kicker">LATEST DOCTOR POSITIONS</span><h2>진행 중인 의사 초빙공고</h2><p>병원과 근무조건을 같은 기준으로 비교하고 상세 공고를 확인하세요.</p></div><Link className="button outline" to="/jobs">전체 초빙정보 보기 <ArrowRight size={17} /></Link></div><div className="job-grid unified-job-grid">{prioritizeJobs(liveJobs).slice(0, 8).map((job) => <JobCard key={job.id} job={job} variant="compact" saved={false} onSave={() => {}} onOpen={() => navigate(`/jobs/${job.id}`)} />)}</div></section>
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
const STANDARD_STEP = 12;
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

function SmartAdDock({ total, onSelect, canRegister }) {
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
    <div className="smart-ad-dock-brand"><Building2 /><span><small>MEDIHELPERS RECRUIT</small><strong>병원 채용 바로가기</strong></span></div>
    <div className="smart-ad-dock-count"><small>전체 초빙공고</small><strong>{total.toLocaleString()}</strong><span>건</span></div>
    <div className="smart-ad-dock-links"><Link to="/advertise">광고 상품안내</Link><Link to="/headhunting?role=hospital">채용 상담</Link><Link to="/mypage">내 공고 관리</Link></div>
    <button type="button" className="smart-ad-dock-cta" onClick={() => { trackConversion('smart_ad_dock_open', { canRegister }); onSelect(adPlans[0]); }}>{canRegister ? '초빙공고 등록하기' : '병원 회원가입'} <ArrowRight /></button>
    <button type="button" className="smart-ad-dock-close" onClick={() => setDismissed(true)} aria-label="공고 등록창 닫기"><X /></button>
  </aside>;
}
function JobsPage({ route, qa, liveJobs = jobs }) {
  const siteCategories = useSiteCategories();
  const params = new URLSearchParams(route.split('?')[1] || '');
  const [recruitmentType, setRecruitmentType] = useState(params.get('recruitmentType') || '전체 초빙');
  const [dept, setDept] = useState(params.get('dept') || '전체 진료과');
  const [region, setRegion] = useState(params.get('region') || '전국');
  const [condition, setCondition] = useState(params.get('condition') || '전체 조건');
  const [keyword, setKeyword] = useState(params.get('keyword') || '');
  const [saved, setSaved] = useState(() => readStoredArray('medihelpers_saved_jobs'));
  const [adPlan, setAdPlan] = useState(null);
  const [standardVisible, setStandardVisible] = useState(STANDARD_STEP);
  const [jobSort, setJobSort] = useState('balanced');
  const canRegisterAds = Boolean(qa.active && (qa.info.capabilities.hospital || qa.info.capabilities.admin));
  const requestAdPlan = (plan) => canRegisterAds ? setAdPlan(plan) : navigate('/signup/hospital?next=/advertise');

  // 하루 동안 고정되는 결정적 회전 seed (UTC 일 단위). 세션당 한 번만 계산.
  const daySeed = useMemo(() => Math.floor(Date.now() / 86400000), []);

  // 진료과 빠른 필터용: 진료과 필터 이전, 지역+키워드만 적용한 결과의 진료과별 개수.
  const specialtyStrip = useMemo(() => {
    const scoped = liveJobs.filter((job) => matchesJob(job, { dept: '전체 진료과', region, keyword, recruitmentType, condition }));
    const counts = Object.fromEntries(countByDept(scoped).map((item) => [item.key, item.count]));
    const items = [{ key: '전체 진료과', label: '전체', count: scoped.length }];
    siteCategories.departments.forEach((name) => {
      if (name === '전체 진료과') return;
      if (counts[name]) items.push({ key: name, label: name, count: counts[name] });
    });
    return items;
  }, [liveJobs, region, keyword, recruitmentType, condition, siteCategories.departments]);

  const filtered = useMemo(() => liveJobs.filter((job) => matchesJob(job, { dept, region, keyword, recruitmentType, condition })), [liveJobs, dept, region, keyword, recruitmentType, condition]);
  // 프리미엄: 등급 우선순위 유지 + 등급 내부 진료과·지역 균형.
  // Keep the promoted catalogue in the same stable tier/order as the home page.
  // Re-randomising it on every visit made familiar spotlight cards appear to be missing.
  const orderedPromoted = useMemo(() => prioritizeJobs(filtered.filter((job) => job.adTier)), [filtered]);
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
    syncSavedToServer(id, 'job');
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
  const openJob = (job) => { trackConversion('job_detail_open', { jobId: job.id }); navigate(`/jobs/${job.id}`); };
  const renderPortalCard = (job) => <JobCard key={job.id} job={job} qa={qa} variant="compact" saved={saved.includes(job.id)} onSave={() => toggleSaved(job.id)} onOpen={() => openJob(job)} />;
  const renderStandardCard = (job) => <JobCard key={job.id} job={job} qa={qa} variant="compact" saved={saved.includes(job.id)} onSave={() => toggleSaved(job.id)} onOpen={() => openJob(job)} />;

  const visibleStandard = standardDisplayOrder.slice(0, standardVisible);
  const standardRemaining = standardDisplayOrder.length - visibleStandard.length;

  return <>
    <PageHero
      tone="jobs-hero"
      eyebrow="DOCTOR RECRUITMENT"
      title={<><span className="jobs-hero-part">조건부터 비교하는</span>{' '}<span className="jobs-hero-part">의사 초빙정보</span></>}
      description={<><span className="jobs-description-part">봉직의·원장·검진·비임상 포지션을</span>{' '}<span className="jobs-description-part">진료과와 지역, 근무조건으로 찾고</span>{' '}<span className="jobs-description-part">비공개 조건은 의사 전담 헤드헌터에게 확인하세요.</span></>}
    ><Link className="button outline" to="/headhunting">헤드헌팅 상담 <ArrowRight /></Link></PageHero>
    <nav className="job-hub-nav" aria-label="채용정보 메뉴"><div><strong className="job-hub-title">채용정보</strong><Link className="active" to="/jobs">전체 채용</Link><Link to="/talent">인재정보</Link><Link to="/headhunting">맞춤 초빙</Link><Link to="/matching-report?role=doctor">내 비교 리포트</Link><Link to="/account">내 활동</Link><Link className="job-hub-register" to={canRegisterAds ? '/advertise' : '/signup/hospital?next=/advertise'}>{canRegisterAds ? '공고 등록' : '병원 회원가입'}</Link></div></nav>
    <section className="section jobs-page"><div className="doctor-search-dock"><div className="doctor-search-title"><span><Search /> QUICK SEARCH</span><strong>원하는 의사 초빙조건을 한 번에 찾으세요</strong><button type="button" onClick={resetFilters}>조건 초기화</button></div><div className="filter-bar doctor-filter-bar"><label><BriefcaseBusiness /><HeroSelect label="초빙 유형 필터" value={recruitmentType} onChange={setRecruitmentType} options={recruitmentTypes} /></label><label><Stethoscope /><HeroSelect label="진료과 필터" value={dept} onChange={setDept} options={siteCategories.departments} /></label><label><MapPin /><HeroSelect label="지역 필터" value={region} onChange={setRegion} options={siteCategories.regions} /></label><label className="filter-keyword"><Search /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="병원명, 진료과, 근무조건 검색" /></label></div>
      <div className="doctor-condition-filter" role="group" aria-label="의사 초빙 상세조건">{doctorConditions.map((item) => <button key={item} type="button" className={condition === item ? 'active' : ''} aria-pressed={condition === item} onClick={() => setCondition(item)}>{item}</button>)}</div>
      </div><div className="specialty-strip" role="group" aria-label="진료과 빠른 필터">{specialtyStrip.map((item) => <button key={item.key} type="button" className={`specialty-chip ${dept === item.key ? 'active' : ''}`} aria-pressed={dept === item.key} onClick={() => setDept(item.key)}><span>{item.label}</span><b>{item.count}</b></button>)}</div>
      <div className="result-row portal-result-row"><div><small>검색 결과</small><strong><em>{filtered.length}</em>개의 의사 초빙공고</strong></div><div className="result-actions"><span><Heart size={15} /> 관심공고 {saved.length}개</span><button type="button" className={jobSort === 'balanced' ? 'active' : ''} onClick={() => setJobSort('balanced')}>추천순</button><button type="button" className={jobSort === 'recent' ? 'active' : ''} onClick={() => setJobSort('recent')}>최신순</button></div></div>
      {filtered.length ? <>
        {orderedPromoted.length > 0 && <div className="promoted-jobs portal-promoted-section"><div className="promotion-heading"><div><span><Crown /> PREMIUM DOCTOR RECRUITMENT</span><strong>먼저 확인할 플래티넘 초빙정보</strong><small>병원 로고와 핵심 조건을 같은 규격으로 빠르게 비교하세요</small></div><div className="tier-heading-actions"><button type="button" className="tier-apply-button spotlight" onClick={() => requestAdPlan(adPlans[2])}>{canRegisterAds ? '플래티넘 공고 등록' : '병원 회원가입 후 등록'} <ArrowRight /></button></div></div><div className="job-grid portal-premium-grid unified-job-grid">{orderedPromoted.map(renderPortalCard)}</div></div>}
        <div className="balance-legend compact"><span className="balance-legend-icon"><Sparkles /></span><div><strong>진료과·지역 균형 노출</strong><p>광고 등급을 지키면서 같은 조건의 공고가 한쪽에 몰리지 않도록 고르게 배치합니다.</p></div></div>
        {orderedStandard.length > 0 && <div className="standard-jobs"><div className="standard-heading"><div><small>ACTIVE DOCTOR POSITIONS</small><strong>진행 중 의사 초빙공고</strong><span>진료과·지역 균형순 · {visibleStandard.length}/{orderedStandard.length}</span></div><button type="button" className="tier-apply-button basic" onClick={() => requestAdPlan(adPlans[0])}>{canRegisterAds ? '베이직 공고 올리기' : '병원 회원가입 후 등록'} <ArrowRight /></button></div><div className="job-grid standard-job-grid unified-job-grid">{visibleStandard.map(renderStandardCard)}</div>{standardRemaining > 0 && <button type="button" className="standard-more" onClick={() => setStandardVisible((current) => current + STANDARD_STEP)}>공고 더보기 <em>남은 {standardRemaining}개</em> <ArrowRight size={16} /></button>}</div>}
        <div className="decision-nudge"><div><span><Crown /> MATCHING REPORT</span><h3>{saved.length ? `찜한 ${saved.length}개 병원, 조건별로 비교해보세요` : '관심 병원을 고르고 매칭 리포트를 만들어보세요'}</h3><p>근무·보수·거리·진료 범위를 비교하고 확인할 질문을 헤드헌터에게 그대로 전달합니다.</p></div><Link className="button dark" to="/matching-report?role=doctor" onClick={() => trackConversion('jobs_matching_report', { savedCount: saved.length })}>매칭 리포트 만들기 <ArrowRight /></Link></div>
      </> : <div className="empty-state"><Search /><h3>조건에 맞는 공고를 찾지 못했습니다</h3><p>검색 조건을 바꾸거나 헤드헌터에게 비공개 포지션을 문의해보세요.</p><button className="button primary" onClick={resetFilters}>검색 초기화</button></div>}
    </section>
    <SmartAdDock total={liveJobs.length} onSelect={requestAdPlan} canRegister={canRegisterAds} />
    <ConversionBanner title="공개된 공고에 원하는 조건이 없나요?" description="등록되지 않은 비공개 포지션까지 함께 찾아드립니다." />
    {adPlan && <Checkout plan={adPlan} onClose={() => setAdPlan(null)} />}
  </>;
}

function TalentPage({ qa, route = '', liveTalent = talent, medicalTalent = [] }) {
  const siteCategories = useSiteCategories();
  // 의사·의료인을 한 화면에서 필터 탭으로 전환한다. 목적(인재 탐색)이 같아 같은 위치에 노출.
  const [staffFilter, setStaffFilter] = useState("all");
  const sourceTalent = useMemo(() => {
    if (staffFilter === "doctor") return liveTalent;
    if (staffFilter === "medical") return medicalTalent;
    return [...liveTalent, ...medicalTalent];
  }, [staffFilter, liveTalent, medicalTalent]);
  const [dept, setDept] = useState("전체 진료과");
  const [region, setRegion] = useState("전국");
  const [availability, setAvailability] = useState("전체 시점");
  const [keyword, setKeyword] = useState("");
  const [talentSort, setTalentSort] = useState("recent");
  const [talentVisible, setTalentVisible] = useState(TALENT_PAGE_SIZE);
  const [selectedTalent, setSelectedTalent] = useState(null);
  // 열람권 결제 완료 후 /talent?open=코드 로 진입하면 그 인재 상세를 바로 연다(목록으로 안 돌아가게).
  const openCode = useMemo(() => new URLSearchParams(route.split('?')[1] || '').get('open') || '', [route]);
  useEffect(() => {
    if (!openCode) return;
    const found = sourceTalent.find((p) => p.code === openCode);
    if (found) {
      // 다른 탭에 가려 안 보이지 않도록 전체 탭으로 전환한 뒤 상세를 연다.
      setStaffFilter('all');
      setSelectedTalent(found);
    }
  }, [openCode, sourceTalent]);
  const qaIdentityAccess = Boolean(
    qa?.active &&
      canRevealTalentIdentity(qa.info.capabilities, true),
  );
  const [accountIdentityAccess, setAccountIdentityAccess] = useState(false);
  const [saved, setSaved] = useState(() =>
    readStoredArray("medihelpers_saved_talent"),
  );
  const talentRegions = siteCategories.regions.length > 1 ? siteCategories.regions : ["전국", ...new Set(sourceTalent.flatMap((person) => person.region.split("·")))].filter(Boolean);
  const availableOptions = [
    "전체 시점",
    "즉시",
    "협의",
    "1개월 내",
    "2개월 내",
  ];
  const visible = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    const filteredTalent = sourceTalent.filter((person) => {
      const matchesDept = dept === "전체 진료과" || person.dept === dept;
      const matchesRegion = region === "전국" || person.region.includes(region);
      const matchesAvailable =
        availability === "전체 시점" ||
        person.available.includes(availability.replace(" 내", ""));
      const matchesKeyword =
        !query ||
        [
          person.code,
          person.dept,
          person.career,
          person.region,
          person.preference,
          person.available,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return matchesDept && matchesRegion && matchesAvailable && matchesKeyword;
    });
    return talentSort === "career"
      ? [...filteredTalent].sort(
          (a, b) =>
            Number.parseInt(b.career, 10) - Number.parseInt(a.career, 10),
        )
      : filteredTalent;
  }, [sourceTalent, dept, region, availability, keyword, talentSort]);
  useEffect(() => {
    setTalentVisible(TALENT_PAGE_SIZE);
  }, [dept, region, availability, keyword, talentSort, staffFilter]);
  const visibleTalent = visible.slice(0, talentVisible);
  const talentRemaining = Math.max(0, visible.length - visibleTalent.length);
  const canViewIdentity = qa?.active
    ? qaIdentityAccess
    : accountIdentityAccess;
  useEffect(() => {
    if (qa?.active) {
      setAccountIdentityAccess(false);
      return undefined;
    }
    let active = true;
    fetch("/api/account", {
      credentials: "same-origin",
      headers: { accept: "application/json" },
    })
      .then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(new Error("account lookup failed")),
      )
      .then((result) => {
        if (!active) return;
        setAccountIdentityAccess(
          canRevealTalentIdentity(
            {
              admin: Boolean(result.isAdmin),
              hospital: result.account?.role === "hospital",
            },
            true,
          ),
        );
      })
      .catch(() => active && setAccountIdentityAccess(false));
    return () => {
      active = false;
    };
  }, [qa?.active]);
  const toggleSaved = (code) =>
    setSaved((current) => {
      const next = current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code];
      writeStoredValue("medihelpers_saved_talent", next);
      syncSavedToServer(code, 'talent');
      return next;
    });
  return (
    <>
      <nav className="job-hub-nav talent-hub-nav" aria-label="인재정보 메뉴">
        <div>
          <strong className="job-hub-title">인재정보</strong>
          <Link to="/jobs">채용정보</Link>
          <Link className="active" to="/talent">
            전체 인재
          </Link>
          <Link to="/headhunting?role=hospital">맞춤 인재 추천</Link>
          <Link to="/matching-report?role=hospital">후보 비교</Link>
          <Link to="/account">인재 관리</Link>
          <Link className="job-hub-register" to="/headhunting?role=hospital">
            채용 의뢰
          </Link>
        </div>
      </nav>
      <section className="section talent-page">
        <div className="talent-search-dock">
          <div className="doctor-search-title">
            <span>
              <UserRoundSearch /> TALENT SEARCH
            </span>
            <strong>필요한 진료과와 근무조건으로 인재를 찾으세요</strong>
            <button
              type="button"
              onClick={() => {
                setDept("전체 진료과");
                setRegion("전국");
                setAvailability("전체 시점");
                setKeyword("");
              }}
            >
              조건 초기화
            </button>
          </div>
          <div className="talent-staff-tabs" role="tablist" aria-label="직군 필터">
            {[["all", "전체", liveTalent.length + medicalTalent.length], ["doctor", "의사", liveTalent.length], ["medical", "간호·의료인", medicalTalent.length]].map(([value, label, count]) => (
              <button key={value} type="button" role="tab" aria-selected={staffFilter === value} className={staffFilter === value ? "active" : ""} onClick={() => { setStaffFilter(value); setDept("전체 진료과"); }}>
                {label} <span>{count}</span>
              </button>
            ))}
          </div>
          <div className="talent-filter-grid">
            <label>
              <Stethoscope />
              <div className="talent-field-content">
                <small>진료과</small>
                <HeroSelect
                  label="의사 진료과 필터"
                  value={dept}
                  onChange={setDept}
                  options={siteCategories.departments}
                />
              </div>
            </label>
            <label>
              <MapPin />
              <div className="talent-field-content">
                <small>희망 지역</small>
                <HeroSelect
                  label="의사 희망 지역 필터"
                  value={region}
                  onChange={setRegion}
                  options={talentRegions}
                />
              </div>
            </label>
            <label>
              <CalendarDays />
              <div className="talent-field-content">
                <small>입사 가능</small>
                <HeroSelect
                  label="의사 입사 가능 시점 필터"
                  value={availability}
                  onChange={setAvailability}
                  options={availableOptions}
                />
              </div>
            </label>
            <label className="talent-keyword">
              <Search />
              <div className="talent-field-content">
                <small>키워드</small>
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="진료과, 경력, 희망 조건 검색"
                />
              </div>
            </label>
          </div>
        </div>
        <div className="result-row portal-result-row">
          <div>
            <small>전체 인재정보 · 현재 {visibleTalent.length}명 표시</small>
            <strong>
              총 <em>{visible.length}</em>명의 상담 완료 의사
            </strong>
          </div>
          <div className="result-actions">
            <span>
              <Heart size={15} /> 관심 인재 {saved.length}명
            </span>
            <button
              type="button"
              className={talentSort === "recent" ? "active" : ""}
              onClick={() => setTalentSort("recent")}
            >
              최근 상담순
            </button>
            <button
              type="button"
              className={talentSort === "career" ? "active" : ""}
              onClick={() => setTalentSort("career")}
            >
              경력순
            </button>
          </div>
        </div>
        <div className="talent-grid talent-portal-list">
          {visibleTalent.map((person) => (
            <article className="talent-card" key={person.code}>
              <div className="talent-top">
                <span className="avatar">
                  <UserRound />
                </span>
                <div>
                  <small>{talentDisplayName(person, canViewIdentity)}</small>
                  <h3>
                    {person.dept} · {person.career}
                  </h3>
                </div>
                <span className="talent-public-chip">
                  <BadgeCheck /> {canViewIdentity && person.identityConsent ? "실명 확인" : "이름 비공개"}
                </span>
                {person.sample && <span className="talent-sample-chip">샘플</span>}
                <button
                  className={`talent-save ${saved.includes(person.code) ? "saved" : ""}`}
                  onClick={() => toggleSaved(person.code)}
                  aria-label={`${talentDisplayName(person, canViewIdentity)} 의사 후보 찜하기`}
                >
                  <Heart
                    fill={saved.includes(person.code) ? "currentColor" : "none"}
                  />
                </button>
              </div>
              <dl>
                <div>
                  <dt>희망 지역</dt>
                  <dd>{person.region}</dd>
                </div>
                <div>
                  <dt>희망 조건</dt>
                  <dd>{person.preference}</dd>
                </div>
                <div>
                  <dt>입사 가능</dt>
                  <dd>{person.available}</dd>
                </div>
              </dl>
              <div className="talent-lock-preview">
                <span>
                  <LockKeyhole /> 헤드헌터 상담·후보 동의 후 공개
                </span>
                <p>
                  근무기관 이력 · 세부 술기 · 이직 사유 · 컨설턴트 확인 메모
                </p>
              </div>
              <button
                type="button"
                className="button talent-profile-open full"
                onClick={() => {
                  setSelectedTalent(person);
                  trackConversion("talent_profile_open", {
                    candidate: person.code,
                  });
                }}
              >
                익명 프로필 자세히 보기 <ArrowRight />
              </button>
            </article>
          ))}
        </div>
        {talentRemaining > 0 && (
          <button
            type="button"
            className="standard-more talent-more"
            onClick={() =>
              setTalentVisible((current) => current + TALENT_PAGE_SIZE)
            }
          >
            인재 더보기
            <em>남은 {talentRemaining}명</em>
            <ArrowRight size={16} />
          </button>
        )}
        {!visible.length && (
          <div className="empty-state">
            <UserRoundSearch />
            <h3>조건에 맞는 인재를 찾지 못했습니다</h3>
            <p>
              검색 조건을 바꾸거나 전담 컨설턴트에게 비공개 인재 추천을
              요청해보세요.
            </p>
          </div>
        )}
        <div className="decision-nudge report-nudge">
          <div>
            <span>
              <BarChart3 /> MATCHING REPORT
            </span>
            <h3>
              {saved.length
                ? `찜한 ${saved.length}명 의사, 채용조건과 비교해보세요`
                : "관심 의사를 찜하고 적합 조건을 비교해보세요"}
            </h3>
            <p>
              전문과목·경력·희망 지역·입사 시점을 비교하고 확인 질문을
              헤드헌터에게 전달합니다.
            </p>
          </div>
          <Link className="button dark" to="/matching-report?role=hospital">
            의사 매칭 리포트 <ArrowRight />
          </Link>
        </div>
      </section>
      <ConversionBanner
        title="찾는 인재가 따로 있으신가요?"
        description="채용 조건을 남기면 공개되지 않은 인재풀까지 확인해드립니다."
        hospital
      />
      {selectedTalent && (
        <TalentDetailModal
          person={selectedTalent}
          canViewIdentity={canViewIdentity}
          onClose={() => setSelectedTalent(null)}
        />
      )}
    </>
  );
}

const talentProfileGuide = {
  소화기내과: {
    focus: "내시경 진료 비중이 높은 검진센터·병원급 소화기 클리닉을 우선 검토합니다.",
    strengths: ["위·대장 내시경", "용종절제술(EMR)", "복부 초음파", "검진 결과 상담"],
  },
  내과: {
    focus: "외래 진료와 건강검진 결과 상담 중심의 포지션을 우선 검토합니다.",
    strengths: ["만성질환 외래", "검진 결과 상담", "환자 커뮤니케이션"],
  },
  정형외과: {
    focus: "외래 중심 진료와 병원 운영에 참여할 수 있는 원장 포지션을 선호합니다.",
    strengths: ["정형외과 외래", "환자 설명·상담", "원장 포지션 검토"],
  },
  소아청소년과: {
    focus: "지역 제한 없이 안정적인 외래 진료 환경을 폭넓게 검토합니다.",
    strengths: ["소아 외래 진료", "보호자 상담", "빠른 입사 가능"],
  },
  영상의학과: {
    focus: "판독 업무 비중이 높고 당직 부담이 적은 근무 환경을 선호합니다.",
    strengths: ["영상 판독", "협진 커뮤니케이션", "당직 없는 근무 선호"],
  },
  가정의학과: {
    focus: "건강검진과 결과 상담을 중심으로 한 주 4일 근무를 우선 검토합니다.",
    strengths: ["건강검진", "문진·결과 상담", "주 4일 선호"],
  },
  마취통증의학과: {
    focus: "통증클리닉 진료와 운영에 함께할 수 있는 원장 포지션을 검토합니다.",
    strengths: ["통증 외래", "시술 상담", "원장 포지션 검토"],
  },
};

function TalentDetailModal({ person, canViewIdentity, onClose }) {
  const guide = talentProfileGuide[person.dept] || {
    focus: `${person.preference} 조건을 중심으로 새로운 근무지를 검토합니다.`,
    strengths: ["전문의 경력", "희망 조건 상담 완료", "입사 일정 조율 가능"],
  };
  // 열람권 보유 시 서버가 연락처·상세를 내려준다. 없으면 unlocked:false.
  const [unlock, setUnlock] = useState({ loading: true, unlocked: false, detail: null, limited: false, message: "" });
  useEffect(() => {
    let active = true;
    fetch(withBase(`/api/talent-detail/${encodeURIComponent(person.code)}`), { credentials: "same-origin", headers: { accept: "application/json" } })
      // 429(열람 한도 초과)는 응답 본문(limited/message)을 읽어 사용자에게 안내한다.
      .then((r) => r.json().catch(() => ({})).then((body) => ({ ok: r.ok, status: r.status, body })))
      .then(({ body }) => { if (active) setUnlock({ loading: false, unlocked: Boolean(body.unlocked), detail: body.detail || null, limited: Boolean(body.limited), message: body.message || "" }); })
      .catch(() => active && setUnlock({ loading: false, unlocked: false, detail: null, limited: false, message: "" }));
    return () => { active = false; };
  }, [person.code]);
  const d = unlock.detail || {};
  return (
    <Modal
      wide
      variant="talent-detail-modal"
      label={`${talentDisplayName(person, canViewIdentity)} 의사 프로필`}
      onClose={onClose}
    >
      <div className="talent-detail-hero">
        <span className="talent-detail-avatar"><UserRound /></span>
        <div>
          <span className="talent-verified"><BadgeCheck /> {person.sample ? '샘플 프로필 (예시)' : '메디헬퍼스 상담 확인'}</span>
          <small>{talentDisplayName(person, canViewIdentity)} · {canViewIdentity ? "실명 확인" : "이름 비공개"}</small>
          <h2>{person.dept} · {person.career}</h2>
          <p>{person.sample ? '화면 구성을 보여주는 예시 프로필입니다. 실제 후보가 아니며 열람권 결제 대상이 아닙니다.' : '개인 식별정보 없이 병원이 먼저 검토할 수 있는 핵심 조건만 공개합니다.'}</p>
        </div>
      </div>

      <div className="talent-detail-body">
        <section className="talent-detail-summary" aria-label="후보 핵심 조건">
          <div><span>희망 지역</span><strong>{person.region}</strong></div>
          <div><span>희망 근무</span><strong>{person.preference}</strong></div>
          <div><span>입사 가능</span><strong>{person.available}</strong></div>
        </section>

        <div className="talent-detail-columns">
          <section className="talent-detail-section">
            <div className="talent-detail-title">
              <span><Target /></span>
              <div><small>MATCHING POINT</small><h3>병원이 먼저 확인할 핵심 포인트</h3></div>
            </div>
            <p className="talent-focus-copy">{guide.focus}</p>
            <div className="talent-strength-list">
              {guide.strengths.map((strength) => <span key={strength}><Check /> {strength}</span>)}
            </div>
          </section>

          <section className="talent-detail-section talent-consult-status">
            <div className="talent-detail-title">
              <span><ClipboardCheck /></span>
              <div><small>CONSULTATION CHECK</small><h3>상담에서 확인한 범위</h3></div>
            </div>
            <ul>
              <li><CircleCheck /> 전문과목과 전문의 경력</li>
              <li><CircleCheck /> 희망 지역과 근무 형태</li>
              <li><CircleCheck /> 입사 가능 시점과 조율 의사</li>
            </ul>
          </section>
        </div>

        {unlock.unlocked ? (
          <section className="talent-detail-unlocked">
            <div className="talent-detail-title">
              <span><BadgeCheck /></span>
              <div><small>UNLOCKED · 열람권 확인</small><h3>연락처·이력서 상세</h3></div>
            </div>
            <dl className="talent-contact-grid">
              {d.name && <div><dt>성명</dt><dd>{d.name}</dd></div>}
              {d.phone && <div><dt>연락처</dt><dd><a href={`tel:${String(d.phone).replace(/\D/g, '')}`}>{d.phone}</a></dd></div>}
              {d.email && <div><dt>이메일</dt><dd><a href={`mailto:${d.email}`}>{d.email}</a></dd></div>}
              {d.specialty && <div><dt>전문분야</dt><dd>{d.specialty}</dd></div>}
              {d.detail?.introduction && <div className="wide"><dt>자기소개</dt><dd>{d.detail.introduction}</dd></div>}
            </dl>
          </section>
        ) : (
          <section className={`talent-detail-private${unlock.limited ? ' talent-detail-limited' : ''}`}>
            <span className="talent-private-icon"><LockKeyhole /></span>
            <div>
              {person.sample ? <>
                <small>예시(샘플) 프로필입니다</small>
                <h3>실제 후보 등록 시 이 자리에 열람권 구매가 표시됩니다</h3>
                <p>이 카드는 화면 구성을 보여주는 예시입니다. 의사·의료인이 이력서를 등록하고 구직 공개를 선택하면 실제 후보가 이렇게 노출됩니다.</p>
              </> : unlock.limited ? <>
                <small>금일 열람 한도 초과</small>
                <h3>대량 정보 수집 방지를 위해 잠시 제한되었습니다</h3>
                <p>{unlock.message || '금일 열람 한도를 초과했습니다. 잠시 후 다시 이용해 주세요.'} 추가 열람이 필요하면 담당자에게 문의해 주세요.</p>
              </> : <>
                <small>이력서 열람권으로 열람할 수 있습니다</small>
                <h3>성명 · 연락처 · 이메일 · 근무기관 이력 · 자기소개</h3>
                <p>후보자 동의 범위에서, 열람권을 결제한 병원 회원에게만 연락처와 이력서 상세가 공개됩니다.</p>
              </>}
            </div>
          </section>
        )}

        <div className="talent-detail-actions">
          <button type="button" className="button outline" onClick={onClose}>목록 계속 보기</button>
          {person.sample ? (
            <Link className="button primary" to="/resume" onClick={onClose}>내 이력서 등록하기 <ArrowRight /></Link>
          ) : unlock.unlocked ? (
            <Link className="button primary" to={`/headhunting?role=hospital&candidate=${person.code}`} onClick={() => trackConversion("talent_consult_cta", { candidate: person.code })}>헤드헌터와 채용 상담 <ArrowRight /></Link>
          ) : unlock.limited ? (
            <a className="button primary" href="tel:0513425463"><Phone /> 담당자 문의</a>
          ) : (
            <Link className="button primary" to={`/talent-unlock?product=talent-unlock-single&talent=${person.code}`} onClick={() => trackConversion("talent_unlock_cta", { candidate: person.code })}>이력서 열람권 구매 <ArrowRight /></Link>
          )}
        </div>
      </div>
    </Modal>
  );
}

function HeadhuntingPage({ route }) {
  const params = new URLSearchParams(route.split("?")[1] || "");
  const role = params.get("role") === "hospital" ? "hospital" : "doctor";
  const context = params.get("job") || params.get("candidate") || "";
  const profession = params.get("profession") || "";
  return (
    <>
      <PageHero
        tone="headhunting-hero"
        eyebrow="1:1 DOCTOR HEADHUNTING"
        title={
          <>
            <span className="headhunting-title-line">의사 전문 헤드헌터에게</span>
            <span className="headhunting-title-line">편하게 상담하세요</span>
          </>
        }
        description={
          <>
            <span className="headhunting-description-part">
              이직을 고민하는 단계부터
            </span>{" "}
            <span className="headhunting-description-part">
              조건 비교·병원 제안·면접·협상까지
            </span>{" "}
            <span className="headhunting-description-part">
              전담 헤드헌터가 비공개로 함께합니다.
            </span>
          </>
        }
      ><div className="headhunting-quick-actions"><Link className="button primary" to="/request/job-seeker"><Stethoscope /> 의사 헤드헌터에게 상담하기 <ArrowRight /></Link></div></PageHero>
      <section className="section consultation-layout consultation-focus">
        <div className="consult-copy">
          <span className="section-kicker">1:1 DOCTOR HEADHUNTING</span>
          <h2>
            <span>공고보다 먼저,</span>
            <span>의사의 상황을 듣습니다</span>
          </h2>
          <p>
            같은 진료과라도 원하는 진료 방식과 삶의 조건은 다릅니다.
            메디헬퍼스는 보수만 맞추지 않고 오래 만족할 수 있는 병원과 의사를
            연결합니다.
          </p>
          <div className="consult-points">
            <div>
              <span>
                <Phone />
              </span>
              <div>
                <strong>빠른 첫 연락</strong>
                <p>접수 내용을 확인하고 가능한 시간에 연락드립니다.</p>
              </div>
            </div>
            <div>
              <span>
                <ShieldCheck />
              </span>
              <div>
                <strong>철저한 비공개</strong>
                <p>
                  동의 전에는 이직 의사와 병원 내부정보를 공개하지 않습니다.
                </p>
              </div>
            </div>
            <div>
              <span>
                <TrendingUp />
              </span>
              <div>
                <strong>실제 조건 협상</strong>
                <p>
                  보수, 진료 범위, 당직과 입사 일정을 구체적으로 조율합니다.
                </p>
              </div>
            </div>
          </div>
          <div className="direct-contact">
            <small>바로 상담하고 싶다면</small>
            <a href="tel:0513425463">051-342-5463</a>
            <span>평일 09:00–18:00</span>
          </div>
        </div>
        <ConsultationForm
          key={`${role}-${context}-${profession}`}
          initialRole={role}
          initialContext={context}
          initialProfession={profession}
          initialTopic={role === 'hospital' && context ? '의사 추천' : ''}
        />
      </section>
      <section className="section soft">
        <div className="section-head centered">
          <div>
            <span className="section-kicker">TWO-SIDED DOCTOR HEADHUNTING</span>
            <h2>의사와 병원, 서로 다른 고민을 해결합니다</h2>
          </div>
        </div>
        <div className="compare-grid">
          <div>
            <Stethoscope />
            <h3>의사에게</h3>
            <ul>
              <li>
                <Check /> 공개하지 않고 이직 가능성 확인
              </li>
              <li>
                <Check /> 비공개 포지션과 실제 근무조건 안내
              </li>
              <li>
                <Check /> 보수·진료범위·스케줄 협상 지원
              </li>
              <li>
                <Check /> 퇴사와 입사 일정 조율
              </li>
            </ul>
          </div>
          <div>
            <Building2 />
            <h3>병원에게</h3>
            <ul>
              <li>
                <Check /> 의사 초빙조건과 공고 문구 개선
              </li>
              <li>
                <Check /> 익명 의사 인재풀 후보 발굴
              </li>
              <li>
                <Check /> 면접 일정과 후보 피드백 관리
              </li>
              <li>
                <Check /> 광고 또는 성공보수 방식 선택
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

function Checkout({ plan }) {
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState("card");
  const [facilityType, setFacilityType] = useState("");
  const [facilityError, setFacilityError] = useState("");
  const [brandPreview, setBrandPreview] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandFile, setBrandFile] = useState(null);
  const [brandError, setBrandError] = useState("");
  const [facilityPhotos, setFacilityPhotos] = useState([]);
  const [photoError, setPhotoError] = useState("");
  const [activeDrop, setActiveDrop] = useState("");
  useEffect(() => () => {
    if (brandPreview) URL.revokeObjectURL(brandPreview);
  }, [brandPreview]);
  const chooseBrand = (file, input) => {
    setBrandError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      if (input) input.value = "";
      setBrandName("");
      setBrandFile(null);
      setBrandError("PNG·JPG·WEBP 이미지 파일을 선택해주세요.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      if (input) input.value = "";
      setBrandName("");
      setBrandFile(null);
      setBrandError("8MB 이하 파일을 선택해주세요.");
      return;
    }
    if (brandPreview) URL.revokeObjectURL(brandPreview);
    setBrandName(file.name);
    setBrandFile(file);
    setBrandPreview(URL.createObjectURL(file));
  };
  const selectBrand = (event) =>
    chooseBrand(event.currentTarget.files?.[0], event.currentTarget);
  const chooseFacilityPhotos = (files, input) => {
    const selected = [...(files || [])];
    setPhotoError("");
    const available = Math.max(0, 6 - facilityPhotos.length);
    if (!available) {
      setPhotoError("병원 사진은 최대 6장까지 등록할 수 있습니다.");
      if (input) input.value = "";
      return;
    }
    const valid = selected
      .filter(
        (file) =>
          file.type.startsWith("image/") && file.size <= 8 * 1024 * 1024,
      )
      .slice(0, available);
    if (valid.length !== selected.length)
      setPhotoError(
        "이미지 파일만 장당 8MB 이하로, 최대 6장까지 등록해주세요.",
      );
    setFacilityPhotos((current) => [
      ...current,
      ...valid.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    ]);
    if (input) input.value = "";
  };
  const selectFacilityPhotos = (event) =>
    chooseFacilityPhotos(event.currentTarget.files, event.currentTarget);
  const dropZoneProps = (target, onFiles) => ({
    onDragEnter: (event) => {
      event.preventDefault();
      setActiveDrop(target);
    },
    onDragOver: (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setActiveDrop(target);
    },
    onDragLeave: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setActiveDrop("");
    },
    onDrop: (event) => {
      event.preventDefault();
      setActiveDrop("");
      onFiles(event.dataTransfer.files);
    },
  });
  const removeFacilityPhoto = (index) => {
    setFacilityPhotos((current) => {
      URL.revokeObjectURL(current[index].url);
      return current.filter((_, photoIndex) => photoIndex !== index);
    });
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!facilityType) {
      setFacilityError("기관 유형을 선택해주세요.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    formData.delete("brandImage");
    const data = {
      ...Object.fromEntries(formData.entries()),
      brandImageName: brandFile?.name || "",
      logoName: brandFile?.name || "",
      bannerName: "",
      hospitalPhotoNames: facilityPhotos.map((photo) => photo.name),
      premiumBrandMode: brandFile ? "single-brand-image" : "auto-wordmark",
    };
    setSubmitError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/payment-orders", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: plan.id,
          paymentMethod: method,
          customerName: data.manager,
          customerEmail: data.email,
          customerPhone: data.phone,
          metadata: data,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || "결제 요청을 저장하지 못했습니다.");
      appendStoredRecord("medihelpers_ad_requests", {
        id: result.order?.orderNumber || `AD-${Date.now()}`,
        planId: plan.id,
        amount: plan.price,
        paymentMethod: method,
        status: result.order?.status || "pending_review",
        createdAt: new Date().toISOString(),
        ...data,
      });
      setDone(true);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <section className="ad-apply-page" aria-label="의사 초빙공고 등록">
      <div className="ad-apply-shell">
        <nav className="ad-apply-breadcrumb" aria-label="현재 위치">
          <Link to="/advertise">광고센터</Link>
          <ArrowRight />
          <span>의사 초빙공고 등록</span>
        </nav>
      {done ? (
        <div className="checkout-success ad-apply-success">
          <span>
            <CircleCheck />
          </span>
          <h2>광고 결제 요청이 접수되었습니다</h2>
          <p>
            초빙공고 내용과 병원 브랜드 정보를 확인한 뒤 결제 안내를
            보내드립니다.
            <br />
            PG 연동 전까지는 이 단계에서 실제 금액이 청구되지 않습니다.
          </p>
          <div className="ad-apply-success-actions">
            <Link className="button outline" to="/advertise">광고센터로 돌아가기</Link>
            <Link className="button primary" to="/qa-preview">내 공고 관리</Link>
          </div>
        </div>
      ) : (
        <>
          <header className="ad-apply-header">
            <div>
              <small>DOCTOR RECRUITMENT AD</small>
              <h1>의사 초빙공고 등록</h1>
              <p>병원 정보와 채용조건을 차례대로 입력해주세요. 접수 후 전담 헤드헌터가 내용과 게시 일정을 확인합니다.</p>
            </div>
            <div className="ad-apply-help"><ShieldCheck /><span><strong>결제 전 검수</strong>입력 중에는 비용이 청구되지 않습니다.</span></div>
          </header>
          <ol className="ad-apply-steps">
            <li className="active"><b>1</b><span>병원·브랜드 정보</span></li>
            <li><b>2</b><span>채용조건 입력</span></li>
            <li><b>3</b><span>검수·결제 안내</span></li>
          </ol>
          <form className="checkout-grid" onSubmit={submit}>
            <div className="checkout-form">
              <section className="ad-form-section">
                <div className="ad-form-section-head">
                  <span>01</span>
                  <div><h2>병원 브랜드 이미지</h2><p>로고와 배너를 따로 올릴 필요 없이 한 장만 등록하면 됩니다.</p></div>
                  <em>선택사항</em>
                </div>
                <div className={`single-brand-upload ${activeDrop === "brand" ? "is-dragging" : ""}`} {...dropZoneProps("brand", (files) => chooseBrand(files?.[0]))}>
                  <div className="banner-preview">
                  {brandPreview ? (
                    <img
                      src={brandPreview}
                      alt="선택한 병원 브랜드 이미지 미리보기"
                    />
                  ) : (
                    <div>
                      <Building2 />
                      <strong>이미지가 없어도 공고 등록 가능</strong>
                      <small>미등록 시 병원명을 중심으로 단정한 기본 카드를 자동 생성합니다.</small>
                    </div>
                  )}
                </div>
                <label>
                  <span>
                    병원 브랜드 이미지 <i>공고 목록과 상세 페이지에 공통 사용</i>
                  </span>
                  <input
                    name="brandImage"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={selectBrand}
                  />
                  <div className="upload-button">
                    <Upload />
                    <div>
                      <strong>{brandName || "클릭하거나 이미지를 끌어 놓으세요"}</strong>
                      <small>권장 1200×400px 가로형 · PNG·JPG·WEBP · 최대 8MB</small>
                    </div>
                  </div>
                  {brandError && <em>{brandError}</em>}
                </label>
                <div className="single-brand-guide">
                  <strong>어떤 이미지를 올리면 되나요?</strong>
                  <span><Check /> 병원 로고 또는 병원명 워드마크가 들어간 가로형 이미지 1장</span>
                  <span><Check /> 투명 배경 PNG를 권장하며, 다른 비율은 여백을 넣어 안전하게 표시</span>
                  <span><Check /> 홍보 문구가 많은 광고 전단 이미지는 사용하지 않음</span>
                </div>
              </div>
              </section>
              <section className="ad-form-section">
                <div className="ad-form-section-head">
                  <span>02</span>
                  <div><h2>병원 사진</h2><p>진료실·대기실·건물 등 실제 근무환경을 보여주는 상세 갤러리입니다.</p></div>
                  <em>선택사항</em>
                </div>
              <section className={`facility-photo-upload ${activeDrop === "facility" ? "is-dragging" : ""}`} {...dropZoneProps("facility", chooseFacilityPhotos)}>
                <div className="facility-upload-head">
                  <div>
                    <strong>병원 사진</strong>
                    <span>선택사항 · 예: 1600×1000px 가로형 · PNG·JPG·WEBP · 장당 8MB · 최대 6장</span>
                  </div>
                  <label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={selectFacilityPhotos}
                    />
                    <Upload /> 클릭 또는 드래그
                  </label>
                </div>
                {facilityPhotos.length ? (
                  <div className="facility-photo-preview">
                    {facilityPhotos.map((photo, index) => (
                      <figure key={`${photo.name}-${index}`}>
                        <img
                          src={photo.url}
                          alt={`병원 사진 미리보기 ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeFacilityPhoto(index)}
                          aria-label={`${photo.name} 삭제`}
                        >
                          <X />
                        </button>
                        <figcaption>
                          {index === 0 ? "대표 사진" : `${index + 1}번 사진`}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <div className="facility-photo-empty">
                    <Building2 />
                    <span>등록한 사진은 병원 상세정보에 갤러리로 노출됩니다.</span>
                  </div>
                )}
                {photoError && <em>{photoError}</em>}
              </section>
              </section>
              <section className="ad-form-section">
                <div className="ad-form-section-head">
                  <span>03</span>
                  <div><h2>병원 기본정보</h2><p>지원자가 근무지와 진료환경을 이해하는 데 필요한 정보입니다.</p></div>
                  <em>필수항목 확인</em>
                </div>
              <div className="institution-fields-head">
                <strong>병원 추가 정보</strong>
                <span>의사가 근무 환경을 판단하는 데 필요한 내용입니다.</span>
              </div>
              <div className="form-grid">
                <label>
                  <span>병원명 *</span>
                  <input
                    required
                    name="hospital"
                    placeholder="병원명을 입력해주세요"
                  />
                </label>
                <label>
                  <span>기관 유형 *</span>
                  <HeroSelect
                    label="기관 유형"
                    name="facilityType"
                    value={facilityType}
                    onChange={(next) => {
                      setFacilityType(next);
                      setFacilityError("");
                    }}
                    options={[
                      { value: "", label: "기관 유형 선택" },
                      "종합병원",
                      "병원",
                      "요양병원",
                      "한방병원",
                      "의원",
                      "검진·전문센터",
                      "기타 의료기관",
                    ]}
                    className="form-custom-select"
                  />
                  {facilityError && (
                    <em className="field-error">{facilityError}</em>
                  )}
                </label>
                <label>
                  <span>담당자명 *</span>
                  <input required name="manager" placeholder="담당자 성함" />
                </label>
                <label>
                  <span>연락처 *</span>
                  <input
                    required
                    name="phone"
                    type="tel"
                    placeholder="010-0000-0000"
                  />
                </label>
                <label>
                  <span>이메일 *</span>
                  <input
                    required
                    name="email"
                    type="email"
                    placeholder="billing@hospital.co.kr"
                  />
                </label>
                <label>
                  <span>병원 위치 *</span>
                  <input
                    required
                    name="address"
                    placeholder="예: 부산광역시 연제구"
                  />
                </label>
                <label>
                  <span>홈페이지 <i>선택</i></span>
                  <input name="website" type="url" placeholder="https://hospital.co.kr" />
                </label>
                <label>
                  <span>진료과목 <i>선택</i></span>
                  <input name="specialties" placeholder="예: 정형외과, 내과, 영상의학과" />
                </label>
                <label>
                  <span>대표자명 <i>선택</i></span>
                  <input name="representative" placeholder="대표자 성함" />
                </label>
                <label>
                  <span>사업자번호 <i>선택</i></span>
                  <input name="businessNumber" inputMode="numeric" placeholder="000-00-00000" />
                </label>
                <label>
                  <span>개원연도 <i>선택</i></span>
                  <input name="established" inputMode="numeric" placeholder="예: 2015년" />
                </label>
                <label>
                  <span>근무 의사 수 <i>선택</i></span>
                  <input name="doctorCount" placeholder="예: 상근 4명 · 비상근 1명" />
                </label>
                <label>
                  <span>재직인원 <i>선택</i></span>
                  <input name="staffCount" placeholder="예: 30명" />
                </label>
                <label>
                  <span>일평균 수술·외래 건수 <i>선택</i></span>
                  <input name="dailyVolume" placeholder="예: 수술 2건 · 외래 40건" />
                </label>
                <label>
                  <span>병상·입원 현황 <i>선택</i></span>
                  <input name="beds" placeholder="예: 30병상 · 평균 입원 22명" />
                </label>
                <label>
                  <span>주요 의료장비 <i>선택</i></span>
                  <input name="equipment" placeholder="예: MRI, CT, C-arm" />
                </label>
              </div>
              </section>
              <section className="ad-form-section">
                <div className="ad-form-section-head">
                  <span>04</span>
                  <div><h2>채용조건</h2><p>공개 가능한 핵심 조건부터 멤버십 상세조건까지 입력해주세요.</p></div>
                  <em>정확할수록 매칭 향상</em>
                </div>
              <label className="wide-field">
                <span>채용 진료과·초빙 형태 *</span>
                <input
                  required
                  name="department"
                  placeholder="예: 정형외과 전문의, 검진센터 진료원장"
                />
              </label>
              <details className="membership-intake" open>
                <summary>
                  <span><Crown /></span>
                  <div><strong>의사 멤버십 상세조건</strong><small>작성한 항목은 일반 회원 중 의사 직군의 ‘결정 조건표’에 정리됩니다</small></div>
                  <em>모두 선택사항</em>
                </summary>
                <div className="form-grid">
                  <label><span>급여 기준</span><input name="salaryBasis" placeholder="예: Net 월 1,500만원 · 퇴직금 별도" /></label>
                  <label><span>인센티브 구조</span><input name="incentive" placeholder="예: 내시경 건별 또는 매출 구간별" /></label>
                  <label><span>평일·토요일 실제 시간</span><input name="exactHours" placeholder="예: 평일 08:30~17:30 · 토 격주 13시" /></label>
                  <label><span>당직·온콜</span><input name="onCall" placeholder="예: 당직 없음 · 온콜 월 1회" /></label>
                  <label><span>일평균 환자·검사량</span><input name="patientLoad" placeholder="예: 외래 35명 · 내시경 8건" /></label>
                  <label><span>시술·검사 범위</span><input name="procedureScope" placeholder="예: 위·대장내시경, 초음파 선택" /></label>
                  <label><span>간호·보조 인력</span><input name="supportTeam" placeholder="예: 전담 간호사 2명 · PA 없음" /></label>
                  <label><span>휴무·연차</span><input name="leavePolicy" placeholder="예: 연차 15일 · 공휴일 휴무" /></label>
                  <label><span>입사 가능 시점</span><input name="startTiming" placeholder="예: 1개월 내 · 협의 가능" /></label>
                  <label><span>면접 절차</span><input name="interviewProcess" placeholder="예: 원장 면담 1회 → 조건 조율" /></label>
                </div>
                <label className="wide-field">
                  <span>채용 담당자 확인 메모</span>
                  <textarea name="verifiedNote" rows="3" placeholder="예: 토요일 근무는 월 2회까지 조정 가능하며, 경력에 따라 급여 상향 협의 가능합니다." />
                </label>
              </details>
              <label className="wide-field">
                <span>
                  병원·초빙 소개 <i>선택</i>
                </span>
                <textarea
                  name="introduction"
                  rows="3"
                  placeholder="진료 환경, 기관의 강점, 초빙 인원과 일정을 간단히 적어주세요."
                />
              </label>
              </section>
              <section className="ad-form-section ad-form-final">
                <div className="ad-form-section-head">
                  <span>05</span>
                  <div><h2>검수·결제 안내</h2><p>원하는 안내 방식을 선택하고 접수를 완료해주세요.</p></div>
                </div>
              <div className="payment-choice">
                <span>결제 안내 방식</span>
                <div>
                  <button
                    type="button"
                    className={method === "card" ? "active" : ""}
                    onClick={() => setMethod("card")}
                  >
                    <CreditCard /> 카드 결제 링크
                  </button>
                  <button
                    type="button"
                    className={method === "transfer" ? "active" : ""}
                    onClick={() => setMethod("transfer")}
                  >
                    <Banknote /> 계좌이체·세금계산서
                  </button>
                </div>
              </div>
              <label className="consent">
                <input required type="checkbox" name="terms" value="agreed" />
                <span>
                  광고 검수, 결제 안내 및 개인정보 수집·이용에 동의합니다. 병원
                  브랜드 이미지는 사용 권한을 확인한 파일만 등록합니다.
                </span>
              </label>
              {submitError && <p className="form-error" role="alert">{submitError}</p>}
              </section>
            </div>
            <aside className="order-summary">
              <small>선택한 상품</small>
              <h3>{plan.name}</h3>
              <p>{plan.unit} 노출</p>
              <ul>
                {plan.features.map((item) => (
                  <li key={item}>
                    <Check />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="price-row">
                <span>
                  결제 예정금액<small>부가세 포함</small>
                </span>
                <strong>{plan.price.toLocaleString()}원</strong>
              </div>
              <button className="button primary full" type="submit">
                {submitting ? "DB에 안전하게 저장 중…" : "결제 안내 요청하기"} <ArrowRight size={17} />
              </button>
              <p className="secure-note">
                <ShieldCheck /> 실제 결제는 공고 검수 후 진행됩니다.
              </p>
            </aside>
          </form>
        </>
      )}
      </div>
    </section>
  );
}

function TalentUnlockCheckout({ plan, talentId }) {
  const [done, setDone] = useState(false);
  const [paidInfo, setPaidInfo] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const accountProfile = useAccountProfile();
  const submit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setSubmitError('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/payment-orders', {
        method:'POST', credentials:'same-origin', headers:{ 'content-type':'application/json' },
        body:JSON.stringify({ productId:plan.id, paymentMethod:'card', customerName:data.name, customerEmail:data.email, customerPhone:data.phone, metadata:{ terms:data.terms, talentId: talentId || '' } })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || '결제 요청을 저장하지 못했습니다.');
      const orderNumber = result.order?.orderNumber;
      const approve = await fetch('/api/payment-approve', {
        method:'POST', credentials:'same-origin', headers:{ 'content-type':'application/json' },
        body:JSON.stringify({ orderNumber, resultCode:'0000' })
      });
      const approveResult = await approve.json().catch(() => ({}));
      trackConversion('talent_unlock_paid', { planId: plan.id, amount: plan.price, talentId, paid: approveResult.approved });
      setPaidInfo(approveResult);
      setDone(true);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };
  if (done) {
    // 결제 완료 → 방금 결제한 그 인재의 이력서 상세를 바로 연다(목록으로 되돌아가지 않게 open 파라미터).
    const openHref = talentId ? `/talent?open=${encodeURIComponent(talentId)}` : '/talent';
    return <section className="section"><div className="checkout-success talent-unlock-success"><span><CircleCheck /></span><h2>{paidInfo?.approved ? '열람권이 활성화되었습니다' : '열람권 결제 요청이 접수되었습니다'}</h2><p>{paidInfo?.approved ? <>{plan.name} · {plan.price.toLocaleString()}원 결제가 처리되었습니다.<br />{paidInfo?.testMode ? '테스트(가상) 결제 모드입니다. 실제 금액은 청구되지 않았습니다.' : '방금 결제한 인재의 이력서를 바로 확인하세요.'}</> : '자격 확인 후 열람 권한을 활성화해 드립니다.'}</p><div className="talent-unlock-success-actions">{paidInfo?.approved && talentId ? <Link className="button primary" to={openHref}>이 인재 이력서 바로 보기 <ArrowRight /></Link> : <Link className="button primary" to="/talent">인재정보로 <ArrowRight /></Link>}<Link className="button outline" to="/talent">인재 목록</Link></div></div></section>;
  }
  return <section className="section talent-unlock-checkout-section"><div className="talent-unlock-checkout"><small>TALENT RESUME UNLOCK</small><h2>{plan.name}</h2><p>{plan.description}</p><ul className="talent-unlock-features">{plan.features.map((f) => <li key={f}><Check /> {f}</li>)}</ul><div className="talent-unlock-price"><strong>{plan.price.toLocaleString()}원</strong><span>/ {plan.period}{plan.unlockCount > 1 ? ` · ${plan.unlockCount}명` : ''}</span></div>{talentId && <p className="talent-unlock-target">열람 대상 인재 코드: <strong>{talentId}</strong></p>}<form onSubmit={submit} key={accountProfile.loaded ? 'ready' : 'loading'}><label><span>병원명 *</span><input required name="name" defaultValue={accountProfile.organization || accountProfile.name} /></label><label><span>담당자 연락처 *</span><input required name="phone" type="tel" placeholder="010-0000-0000" defaultValue={accountProfile.phone} /></label><label><span>이메일 *</span><input required name="email" type="email" defaultValue={accountProfile.email} /></label><label className="consent"><input required type="checkbox" name="terms" value="agreed" /><span>후보자 동의 범위 내 열람이며, 결제·개인정보 수집·이용에 동의합니다.</span></label>{submitError && <p className="form-error" role="alert">{submitError}</p>}<button className="button primary full" type="submit" disabled={submitting}>{submitting ? '결제 처리 중…' : `${plan.price.toLocaleString()}원 결제하기`} <ArrowRight /></button></form><p className="secure-note"><ShieldCheck /> 결제 즉시 해당 인재 연락처·이력서 상세가 열립니다.</p></div></section>;
}

function TalentUnlockPage({ route, qa }) {
  const params = new URLSearchParams(route.split('?')[1] || '');
  const plan = talentUnlockPlans.find((item) => item.id === params.get('product')) || talentUnlockPlans[0];
  const talentId = params.get('talent') || '';
  const canUnlock = Boolean(qa.active && (qa.info.capabilities.hospital || qa.info.capabilities.admin));
  return <>
    <PageHero tone="membership" eyebrow="TALENT RESUME UNLOCK" title="인재 이력서 열람권" description="구직 공개에 동의한 의사·의료인 후보의 연락처와 이력서 상세를 병원 회원이 열람합니다." />
    {canUnlock
      ? <TalentUnlockCheckout plan={plan} talentId={talentId} />
      : <section className="section"><div className="ad-apply-gate-card"><span><Building2 /></span><small>HOSPITAL ACCOUNT REQUIRED</small><h1>병원 회원 로그인 후<br />열람권을 구매할 수 있어요</h1><p>후보 개인정보 보호를 위해 병원 회원만 인재 이력서 열람권을 결제할 수 있습니다.</p><Link className="button primary full" to={`/signup/hospital?next=${encodeURIComponent(route)}`}>로그인·병원 회원가입 <ArrowRight /></Link><Link className="ad-apply-gate-back" to="/medical-staff">인재 목록 다시 보기</Link></div></section>}
  </>;
}

function AdvertisePage({ qa }) {
  const canRegisterAds = Boolean(qa.active && (qa.info.capabilities.hospital || qa.info.capabilities.admin));
  const requestPlan = (nextPlan) => {
    const target = `/advertise/apply?plan=${nextPlan.id}`;
    navigate(canRegisterAds ? target : `/signup/hospital?next=${encodeURIComponent(target)}`);
  };
  return <>
    <PageHero tone="ad" eyebrow="DOCTOR RECRUITMENT AD CENTER" title="좋은 의사에게 먼저 닿는 초빙광고" description="초기 파트너 가격 59,000원부터 시작합니다. 의사 초빙공고 등록부터 전담 컨설턴트의 후보 발굴까지 필요한 만큼 선택하세요."><a className="button light" href="#plans">광고 상품 비교</a></PageHero>
    <section className="section soft" id="plans"><div className="section-head centered"><div><span className="section-kicker">EARLY PARTNER PRICE</span><h2>인지도 대신 가격과 직접지원으로 시작합니다</h2><p>초기 파트너에게 부담이 적은 가격을 적용하고, 실제 결제 전 담당자가 기간과 조건을 다시 확인합니다.</p></div></div><div className="pricing-grid">{adPlans.map((item) => <article className={`price-card ${item.featured ? 'featured' : ''}`} key={item.id}>{item.featured && <span className="popular">추천</span>}<small>{item.label}</small><h3>{item.name}</h3><p>{item.description}</p><div className="price"><strong>{item.price.toLocaleString()}</strong><span>원 / {item.unit}</span></div><ul>{item.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul><button className={`button ${item.featured ? 'primary' : 'outline'} full`} onClick={() => requestPlan(item)}>{canRegisterAds ? '이 상품 신청하기' : '병원 회원가입 후 신청'}</button></article>)}</div><div className="price-principle"><ShieldCheck /><div><strong>숨은 비용 없이 먼저 확인합니다</strong><p>게시기간, 노출 위치, 수정 지원 범위와 최종 결제금액을 담당자가 확인한 뒤 결제를 진행합니다. 초기 가격은 운영 데이터와 서비스 범위에 따라 변경될 수 있으며 결제 전에 안내합니다.</p></div></div><div className="headhunt-plan"><div><span><UsersRound /></span><div><small>SUCCESS-BASED RECRUITING</small><h3>공고만으로 어려운 채용은 전담 헤드헌팅</h3><p>필요한 진료과와 조건을 바탕으로 후보 발굴부터 협상까지 맡아드립니다.</p></div></div><Link className="button dark" to="/headhunting?role=hospital">별도 견적 상담</Link></div></section>
    <section className="section"><div className="section-head centered"><div><span className="section-kicker">ORDER PROCESS</span><h2>결제보다 먼저 공고를 검수합니다</h2></div></div><div className="step-grid three">{[[FileCheck2,'01','상품·공고 접수','병원과 채용 정보를 입력합니다.'],[WalletCards,'02','결제 및 검수','금액과 게시 조건 확인 후 결제합니다.'],[TrendingUp,'03','게시·성과 확인','공고를 게시하고 상담·지원 반응을 확인합니다.']].map(([Icon,n,t,d]) => <div className="step" key={n}><span>{n}</span><Icon /><h3>{t}</h3><p>{d}</p></div>)}</div><div className="legal-note"><ShieldCheck /><p><strong>안전한 광고 운영</strong><br />공고는 메디헬퍼스의 검수 후 게시됩니다. 의료법 및 채용 관련 법령에 위반되거나 사실 확인이 어려운 표현은 수정 요청 또는 게시 거절될 수 있습니다.</p></div></section>
  </>;
}

function AdvertiseApplyPage({ route, qa }) {
  const params = new URLSearchParams(route.split("?")[1] || "");
  const plan = adPlans.find((item) => item.id === params.get("plan")) || adPlans[1];
  const canRegisterAds = Boolean(qa.active && (qa.info.capabilities.hospital || qa.info.capabilities.admin));
  if (!canRegisterAds) {
    const next = `/advertise/apply?plan=${plan.id}`;
    return (
      <section className="ad-apply-page ad-apply-gate">
        <div className="ad-apply-gate-card">
          <span><Building2 /></span>
          <small>HOSPITAL ACCOUNT REQUIRED</small>
          <h1>병원 회원 로그인 후<br />공고를 등록할 수 있어요</h1>
          <p>병원 정보와 담당자 연락처를 안전하게 관리하기 위해 병원 회원만 초빙공고를 접수할 수 있습니다.</p>
          <Link className="button primary full" to={`/signup/hospital?next=${encodeURIComponent(next)}`}>로그인·병원 회원가입 <ArrowRight /></Link>
          <Link className="ad-apply-gate-back" to="/advertise">광고 상품 다시 보기</Link>
        </div>
      </section>
    );
  }
  return <Checkout plan={plan} />;
}

function MembershipCheckout({ plan, onClose }) {
  const [done, setDone] = useState(false);
  const [paidInfo, setPaidInfo] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const accountProfile = useAccountProfile();
  const submit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setSubmitError('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/payment-orders', {
        method:'POST',
        credentials:'same-origin',
        headers:{ 'content-type':'application/json' },
        body:JSON.stringify({ productId:plan.id, paymentMethod:'card', customerName:data.name, customerEmail:data.email, customerPhone:data.phone, metadata:{ terms:data.terms } })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || '결제 요청을 저장하지 못했습니다.');
      const orderNumber = result.order?.orderNumber;
      // 결제 승인: 이니시스 키가 설정돼 있으면 실제 결제창, 없으면 서버가 테스트(가상) 승인 처리.
      if (result.inicis?.configured) {
        // TODO(실키 준비 시): 이니시스 표준결제창(stdpay) 로드·submit. 지금은 승인 엔드포인트로 진행.
      }
      const approve = await fetch('/api/payment-approve', {
        method:'POST', credentials:'same-origin', headers:{ 'content-type':'application/json' },
        body:JSON.stringify({ orderNumber, resultCode:'0000' })
      });
      const approveResult = await approve.json().catch(() => ({}));
      appendStoredRecord('medihelpers_membership_requests', { id:orderNumber || `MEM-${Date.now()}`, planId:plan.id, amount:plan.price, status:approveResult.status || result.order?.status || 'pending_review', createdAt:new Date().toISOString(), ...data });
      trackConversion('checkout_request', { planId: plan.id, amount: plan.price, paid:approveResult.approved });
      setPaidInfo(approveResult);
      setDone(true);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };
  return <Modal onClose={onClose}>{done ? <div className="checkout-success"><span><CircleCheck /></span><h2>{paidInfo?.approved ? '결제가 완료되었습니다' : '멤버십 결제 요청이 접수되었습니다'}</h2><p>{paidInfo?.approved ? <>{plan.name} · {plan.price.toLocaleString()}원 결제가 처리되었습니다.<br />{paidInfo?.testMode ? '테스트(가상) 결제 모드입니다. 실제 금액은 청구되지 않았습니다.' : '결제 내역은 마이페이지에서 확인할 수 있습니다.'}</> : <>회원 유형과 자격을 확인한 뒤 안전한 결제 링크를 보내드립니다.<br />현재는 실제 금액이 청구되지 않습니다.</>}</p><button className="button primary" onClick={onClose}>확인</button></div> : <div className="membership-checkout"><small>MEMBERSHIP ORDER</small><h2>{plan.name}</h2><p>{plan.description}</p><div className="membership-price"><strong>{plan.price.toLocaleString()}원</strong><span>/ {plan.period}</span></div><form onSubmit={submit} key={accountProfile.loaded ? 'ready' : 'loading'}><label><span>{plan.audience === 'doctor' ? '의사 성함' : '병원명'} *</span><input required name="name" defaultValue={plan.audience === 'hospital' ? (accountProfile.organization || accountProfile.name) : accountProfile.name} /></label><label><span>연락처 *</span><input required name="phone" type="tel" placeholder="010-0000-0000" defaultValue={accountProfile.phone} /></label><label><span>이메일 *</span><input required name="email" type="email" defaultValue={accountProfile.email} /></label><label className="consent"><input required type="checkbox" name="terms" value="agreed" /><span>회원 자격 확인, 결제 안내 및 개인정보 수집·이용에 동의합니다.</span></label>{submitError && <p className="form-error" role="alert">{submitError}</p>}<button className="button primary full" type="submit" disabled={submitting}>{submitting ? 'DB에 안전하게 저장 중…' : '결제 안내 요청하기'} <ArrowRight /></button></form><p className="secure-note"><ShieldCheck /> 자격 확인 후 권한이 활성화됩니다.</p></div>}</Modal>;
}

function ValueCalculator({ type, onChoose }) {
  const [count, setCount] = useState(3);
  const single = membershipPlans.find((plan) => plan.id === "doctor-single");
  const pass = membershipPlans.find((plan) => plan.id === "doctor-pass");
  const singleTotal = single.price * count;
  const usePass = pass.price < singleTotal;
  const recommended = usePass ? pass : single;
  return (
    <div className="value-calculator">
      <div>
        <small>나에게 맞는 이용권 계산</small>
        <h3>이번 달에 몇 개 공고를 자세히 볼까요?</h3>
        <p>이용 예상량에 따라 더 경제적인 상품을 바로 비교합니다.</p>
      </div>
      <div className="calculator-control">
        <strong>
          {count}
          <span>개 공고</span>
        </strong>
        <input
          aria-label="예상 이용량"
          type="range"
          min="1"
          max="10"
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
        />
      </div>
      <div className="calculator-result">
        <span>
          {usePass
            ? "월 패스가 더 경제적이에요"
            : "건별 이용권이 부담이 적어요"}
        </span>
        <strong>{recommended.name}</strong>
        <p>
          건별 이용 시 {singleTotal.toLocaleString()}원 · 추천 상품{" "}
          {recommended.price.toLocaleString()}원
        </p>
        <button
          className="button primary"
          onClick={() => {
            trackConversion("calculator_recommendation", {
              type,
              count,
              planId: recommended.id,
            });
            onChoose(recommended);
          }}
        >
          추천 이용권 선택
        </button>
      </div>
    </div>
  );
}

function MembershipPage({ route, qa }) {
  const params = new URLSearchParams(route.split("?")[1] || "");
  const hospitalConsult = params.get("type") === "hospital" || Boolean(params.get("candidate"));
  const type = "doctor";
  const [selected, setSelected] = useState(null);
  const plans = membershipPlans.filter((plan) => plan.audience === type);
  const contextId = params.get("job");
  const qaMemberActive =
    qa?.active && qa.info.capabilities.membership && type === "doctor";
  if (hospitalConsult) {
    const candidateId = params.get("candidate") || "";
    return <>
      <PageHero tone="membership" eyebrow="MEDIHELPERS HEADHUNTER" title="후보 문의는 결제보다 상담부터" description="메디헬퍼스 헤드헌터가 병원의 채용조건과 후보자의 의사를 먼저 확인한 뒤 필요한 범위에서 안전하게 연결합니다." />
      <section className="section hospital-concierge-membership"><div className="hospital-concierge-card"><span><UsersRound /></span><div><small>HUMAN-LED RECRUITING</small><h2>{candidateId ? `${candidateId} 후보가 궁금하신가요?` : '찾는 의사 조건을 말씀해주세요'}</h2><p>소개 요청권이나 후보 열람권을 판매하지 않습니다. 담당 헤드헌터가 진료과·경력·지역·보수조건을 듣고 후보자의 공개 동의를 확인한 뒤 상담을 이어갑니다.</p><ul><li><Check /> 병원 채용조건 정리</li><li><Check /> 후보 적합성 확인</li><li><Check /> 의사 동의 후 정보 전달</li><li><Check /> 면접·조건 협상 지원</li></ul><div><Link className="button primary" to={`/headhunting?role=hospital${candidateId ? `&candidate=${candidateId}` : ''}`}>헤드헌터에게 상담하기 <ArrowRight /></Link><a className="button outline" href="tel:0513425463"><Phone /> 051-342-5463</a></div></div></div></section>
    </>;
  }
  return (
    <>
      <PageHero
        tone="membership"
        eyebrow="OPTIONAL CAREER SERVICE"
        title="정보 열람은 무료로, 중요한 판단은 더 정교하게"
        description="의사 인증 회원은 급여·근무표·당직·진료강도 등 지원 판단에 필요한 핵심정보와 헤드헌터 상담을 무료로 이용합니다. 프리미엄은 알림·분석·우선 일정처럼 시간을 줄이는 선택 서비스입니다."
      />
      {qaMemberActive && (
        <section className="qa-membership-active">
          <span>
            <Crown />
          </span>
          <div>
            <small>QA SUBSCRIPTION ACTIVE</small>
            <strong>커리어 컨시어지 이용 중</strong>
            <p>
              맞춤 포지션 즉시 알림, 우선 상담 예약과 조건 분석 리포트를
              이용하고 있습니다. 다음 가상 결제일 2026.08.16
            </p>
          </div>
          <Link to="/qa-preview">
            테스트 상태 변경 <ArrowRight />
          </Link>
        </section>
      )}
      <section className="section membership-section">
        <div className="membership-tabs membership-tabs--single">
          <button className="active"><Stethoscope /> 의사용 멤버십</button>
        </div>
        {contextId && (
          <div className="context-offer">
            <div>
              <span>
                <CircleCheck /> 무료 미리보기 확인 완료
              </span>
              <h3>의사 인증 후 상세조건을 무료로 확인하세요</h3>
              <p>
                급여 구조·실제 근무표·환자량·지원 인력 등 지원 판단에 필요한 정보를 열람료 없이 제공합니다.
              </p>
            </div>
            <Link className="button primary" to={`/jobs/${contextId}`}>무료 상세정보 계속 보기 <ArrowRight /></Link>
          </div>
        )}
        <section className="membership-detail-catalog" aria-labelledby="membership-detail-title">
          <div className="membership-detail-heading">
            <span><Crown /></span>
            <div><small>VERIFIED DOCTOR ACCESS</small><h2 id="membership-detail-title">의사 인증 회원에게 무료로 공개되는 정보</h2><p>지원 여부를 판단하는 데 필요한 조건은 결제 없이 확인합니다.</p></div>
          </div>
          <div className="membership-detail-grid">
            {[
              [Banknote, "보수·계약", "Net·세전 기준, 인센티브, 퇴직금, 계약기간"],
              [CalendarDays, "실제 근무표", "평일·토요일 시간, 주당 근무일, 휴무, 당직·온콜"],
              [Stethoscope, "진료 강도", "환자 수, 검사·시술 비중, 의료장비, 간호·보조 인력"],
              [BadgeCheck, "입사 판단", "채용 사유, 의료진 구성, 입사 시점, 면접 절차, 확인 메모"],
            ].map(([Icon, title, copy]) => (
              <article key={title}><span><Icon /></span><strong>{title}</strong><p>{copy}</p><small><Check /> 의사 인증 후 무료 확인</small></article>
            ))}
          </div>
        </section>
        <div className="access-explain">
          <div>
            <span className="access-number">FREE</span>
            <h3>핵심정보·상담 무료</h3>
            <p>급여, 근무표, 당직, 진료강도, 병원 확인정보와 헤드헌터 상담</p>
          </div>
          <ArrowRight />
          <div className="paid-access">
            <span className="access-number">OPTIONAL</span>
            <h3>시간을 아끼는 선택 서비스</h3>
            <p>즉시 알림, 우선 상담 예약, 연봉·계약 분석과 정기 커리어 점검</p>
          </div>
        </div>
        <div className="membership-free-promise"><ShieldCheck /><div><strong>유료 가입 없이도 이직 상담과 포지션 제안을 받을 수 있습니다</strong><p>프리미엄 가입 여부는 병원 추천 순서나 헤드헌터의 기본 상담 품질에 영향을 주지 않습니다.</p></div><Link className="button outline" to="/request/job-seeker">무료 이직상담 신청</Link></div>
        <div className="membership-grid">
          {plans.map((plan) => (
            <article
              className={`membership-card ${plan.featured ? "featured" : ""}`}
              key={plan.id}
            >
              {plan.featured && <span className="popular">추천</span>}
              <small>
                {plan.period === "월" ? "CAREER CONCIERGE" : "ONE-TIME REVIEW"}
              </small>
              <h2>{plan.name}</h2>
              <p>{plan.description}</p>
              <div className="price">
                <strong>{plan.price.toLocaleString()}</strong>
                <span>원 / {plan.period}</span>
              </div>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check /> {feature}
                  </li>
                ))}
              </ul>
              <button
                className={`button ${plan.featured ? "primary" : "outline"} full`}
                onClick={() => {
                  trackConversion("membership_plan_select", {
                    planId: plan.id,
                  });
                  setSelected(plan);
                }}
              >
                선택 서비스 신청
              </button>
            </article>
          ))}
        </div>
        <div className="privacy-gate">
          <ShieldCheck />
          <div>
            <strong>병원용 후보 소개권은 판매하지 않습니다</strong>
            <p>
              병원의 후보 문의는 메디헬퍼스 헤드헌터 상담으로 연결되며,
              의사의 명시적 동의가 확인된 뒤에만 필요한 정보가 전달됩니다.
            </p>
          </div>
        </div>
      </section>
      {selected && (
        <MembershipCheckout plan={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
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

function ResumeAccessGate({ signedIn = false }) {
  return <section className="resume-access-gate"><span><LockKeyhole /></span><small>MEDICAL PROFESSIONALS ONLY</small><h1>{signedIn ? '일반 회원 중 의료인 직군 전용 화면입니다' : '이력서 등록은 일반 회원 로그인 후 이용할 수 있습니다'}</h1><p>{signedIn ? '현재 로그인한 병원 회원 계정으로는 이력서를 등록할 수 없습니다. 일반 회원 계정으로 다시 로그인해주세요.' : '민감한 경력과 구직 정보를 안전하게 관리하기 위해 일반 회원 확인 후 등록 화면을 열어드립니다.'}</p><div><Link className="button primary" to="/signup/doctor?next=/resume"><UserRound /> 일반 회원 로그인·가입</Link><Link className="button outline" to="/jobs">채용공고 먼저 보기</Link></div><aside><ShieldCheck /><span><strong>병원 회원과 비회원은 등록할 수 없습니다.</strong><small>등록한 이력서는 공개 범위를 직접 선택하고 메디헬퍼스 헤드헌터 상담에 활용할 수 있습니다.</small></span></aside></section>;
}

function ResumeRoute({ qa }) {
  const qaDoctor = qa.active && (qa.info.capabilities.doctor || qa.info.capabilities.admin);
  const [accountState, setAccountState] = useState({
    loading: !qaDoctor,
    signedIn: false,
    allowed: qaDoctor,
  });

  useEffect(() => {
    if (qaDoctor) {
      setAccountState({ loading: false, signedIn: true, allowed: true });
      return undefined;
    }
    let active = true;
    fetch("/api/account", {
      credentials: "same-origin",
      headers: { accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("account lookup failed"))))
      .then((result) => {
        if (!active) return;
        const signedIn = Boolean(result.signedIn);
        setAccountState({
          loading: false,
          signedIn,
          allowed: signedIn && result.account?.role === "doctor",
        });
      })
      .catch(() => {
        if (active) setAccountState({ loading: false, signedIn: false, allowed: false });
      });
    return () => {
      active = false;
    };
  }, [qaDoctor]);

  if (accountState.loading) {
    return <section className="resume-access-gate resume-access-loading"><span><ShieldCheck /></span><small>SECURE ACCOUNT CHECK</small><h1>일반 회원 정보를 확인하고 있습니다</h1><p>안전한 이력서 등록 화면을 준비하고 있습니다.</p></section>;
  }
  return accountState.allowed ? <ResumePage /> : <ResumeAccessGate signedIn={accountState.signedIn} />;
}

function ConversionBanner({ title = '좋은 연결을 찾고 계신가요?', description = '이직과 채용, 어느 쪽이든 전담 헤드헌터가 먼저 듣겠습니다.', hospital = false }) {
  return <section className="conversion"><div><small>MEDIHELPERS CONCIERGE</small><h2>{title}</h2><p>{description}</p></div><div><a className="button light" href="tel:0513425463"><Phone size={17} /> 전화 상담</a><Link className="button glass" to={hospital ? '/headhunting?role=hospital' : '/headhunting'}>무료 상담 신청 <ArrowRight size={17} /></Link></div></section>;
}

export function App() {
  const route = useRoute();
  const path = route.split('?')[0].replace(/\/$/, '') || '/';
  const operations = useSiteOperations();
  const liveJobs = useMemo(() => [...operationalDoctorJobs(operations.contents), ...jobs], [operations.contents]);
  const allTalent = useMemo(() => [...operationalTalent(operations.contents), ...talent], [operations.contents]);
  // 인재정보(/talent)는 의사만, 의료인 채용은 의료인만. 정적 talent는 의사로 간주.
  const liveTalent = useMemo(() => allTalent.filter((p) => (p.staffType || 'doctor') === 'doctor'), [allTalent]);
  const medicalTalent = useMemo(() => allTalent.filter((p) => p.staffType === 'medical'), [allTalent]);
  const [qaState, setQaState] = useState(() => normalizeQaState(readStoredString(QA_PREVIEW_STORAGE_KEY)));
  useAdaptivePerformance();
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
  const auth = useAuthGate(qa);
  const mobileAction = qa.active && qa.info.capabilities.signedIn
    ? { to: '/mypage', label: qa.info.capabilities.admin ? '관리 콘솔' : '마이페이지' }
    : { to: '/signup/hospital?next=/advertise', label: '병원 가입' };

  let page;
  if (path === '/') page = <HomePage liveJobs={liveJobs} />;
  else if (path === '/jobs') page = operations.features.doctorRecruitment === false ? <NotFoundPage /> : <JobsPage route={route} qa={qa} liveJobs={liveJobs} />;
  else if (path.startsWith('/jobs/')) {
    const job = liveJobs.find((item) => item.id === decodeURIComponent(path.slice('/jobs/'.length)));
    page = job ? <JobDetailRoute job={job} qa={qa} /> : <NotFoundPage />;
  }
  else if (path === '/professions') page = <Redirect to="/headhunting" />;
  else if (path === '/talent') page = operations.features.talentSearch === false ? <NotFoundPage /> : <AuthGate auth={auth} need="hospital" title="의료진 인재정보는 병원 회원 전용입니다" description="지원 의사의 익명 인재정보 열람은 병원 회원에게만 제공됩니다. 병원 회원으로 로그인하거나 가입 후 이용해 주세요."><TalentPage qa={qa} route={route} liveTalent={liveTalent} medicalTalent={medicalTalent} /></AuthGate>;
  else if (path === '/matching-report') page = <AuthGate auth={auth} title="매칭 리포트는 회원 전용입니다" description="찜한 병원·후보를 비교하는 매칭 리포트는 로그인 후 이용할 수 있습니다."><MatchingReportPage route={route} jobs={liveJobs} talent={liveTalent} onNavigate={navigate} /></AuthGate>;
  else if (path === '/headhunting') page = <HeadhuntingPage route={route} />;
  else if (path === '/medical-staff') page = operations.features.medicalStaffHub === false ? <NotFoundPage /> : <AuthGate auth={auth} title="의료인 채용은 회원 전용입니다" description="간호·의료기사·약무 등 의료인 채용정보는 로그인 후 이용할 수 있습니다."><MedicalStaffPage operations={operations} medicalTalent={medicalTalent} /></AuthGate>;
  else if (path.startsWith('/medical-staff/jobs/')) page = operations.features.medicalStaffHub === false
    ? <NotFoundPage />
    : <MedicalStaffDetailPage operations={operations} jobId={decodeURIComponent(path.slice('/medical-staff/jobs/'.length))} qa={qa} />;
  else if (path === '/advertise/apply') page = operations.features.adRegistration === false ? <NotFoundPage /> : <AdvertiseApplyPage route={route} qa={qa} />;
  else if (path === '/advertise') page = operations.features.adRegistration === false ? <NotFoundPage /> : <AdvertisePage qa={qa} />;
  else if (path === '/membership') page = <MembershipPage route={route} qa={qa} />;
  else if (path === '/talent-unlock') page = <TalentUnlockPage route={route} qa={qa} />;
  else if (path === '/qa-preview') page = <QaPreviewPage qa={qa} />;
  else if (path === '/admin/consultations') page = <ConsultationAdminPage />;
  else if (path === '/admin/recruitment-crm') page = <RecruitmentCrmPage qa={qa} />;
  else if (path === '/admin' || path === '/admin/console') page = <AdminConsolePage qa={qa.active && qa.info.capabilities.admin} />;
  else if (path === '/mypage' || path === '/member-center') page = <MemberCenterPage route={path === '/member-center' ? route.replace('/member-center', '/mypage') : route} qa={qa} />;
  else if (path === '/account/recovery') page = <AccountRecoveryPage />;
  else if (path === '/signup/doctor') page = <AccountPage memberType="doctor" />;
  else if (path === '/signup/hospital') page = <AccountPage memberType="hospital" />;
  else if (path === '/resume') page = operations.features.resumeRegistration === false ? <NotFoundPage /> : <AuthGate auth={auth} title="이력서 등록은 회원 전용입니다" description="이력서에는 개인정보가 포함되어 로그인 후 안전하게 작성할 수 있습니다. 로그인하거나 회원가입 후 이용해 주세요."><ResumeRoute qa={qa} /></AuthGate>;
  else if (path === '/request/job-seeker') page = <HeadHunterRequestPage mode="doctor" qa={qa} />;
  else if (path === '/request/hiring') page = <HeadHunterRequestPage mode="hospital" qa={qa} />;
  else if (path === '/signup' || path === '/account') page = <AccountPage />;
  else if (path === '/terms') page = <TermsPage />;
  else if (path === '/privacy') page = <PrivacyPolicyPage />;
  else if (path === '/about') page = <AboutPage />;
  else page = <NotFoundPage />;
  if (path === '/admin' || path.startsWith('/admin/')) {
    return <div className={`app admin-app ${qa.active ? 'qa-preview-active' : ''}`}>{page}</div>;
  }
  return <div className={`app ${qa.active ? 'qa-preview-active' : ''}`}><div className="scroll-progress" aria-hidden="true" /><Header path={path} qa={qa} operations={operations} /><QaPreviewRibbon qa={qa} /><main key={route} className="route-stage">{page}</main><Footer operations={operations} /><MediAngelAssistant /><div className="mobile-quickbar"><Link to="/jobs"><Search />채용 찾기</Link><Link className="mobile-ad" to={mobileAction.to}><Building2 />{mobileAction.label}</Link></div></div>;
}
