import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import {
  Activity, Ambulance, ArrowLeft, ArrowRight, BadgeCheck, Banknote, BriefcaseBusiness, Building2,
  CalendarDays, Check, ChevronDown, CircleCheck, ClipboardCheck, Clock3,
  CreditCard, Crown, FileCheck2, Heart, HeartPulse, LockKeyhole, Mail, MapPin, Menu, MessageCircle, Microscope, Phone, Pill,
  ScanLine, Search, ShieldCheck, Smile, Sparkles, Stethoscope, Target, TrendingUp, Upload, UserRound,
  UserRoundSearch, UsersRound, WalletCards, X
} from 'lucide-react';
import { adPlans, jobs, membershipPlans, navItems, professions, talent } from './data.js';

const departments = ['전체 진료과', '내과', '정형외과', '소아청소년과', '가정의학과', '영상의학과', '마취통증의학과', '전문의'];
const regions = ['전국', '서울', '경기', '인천', '부산', '경남', '충북', '강원'];

function getRoute() {
  return `${window.location.pathname}${window.location.search}`;
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

function useScrollMotion(route) {
  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return undefined;
    const selector = [
      '.page-hero-inner', '.section-head', '.quick-access', '.home-role-actions', '.member-teaser',
      '.job-card', '.profession-card', '.path-card', '.step', '.price-card', '.membership-card',
      '.feature-grid > div', '.value-grid > div', '.community-grid > div', '.metrics-strip > div',
      '.notice-bar', '.consultation-layout', '.contact-card', '.policy-card', '.conversion'
    ].join(',');
    const elements = [...document.querySelectorAll(selector)];
    document.documentElement.classList.add('motion-enabled');
    elements.forEach((element, index) => {
      element.classList.add('scroll-reveal');
      element.style.setProperty('--reveal-delay', `${(index % 4) * 65}ms`);
    });
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
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  if (getRoute() !== path) window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  const navigation = new CustomEvent('medihelpers:navigate', { cancelable: true });
  window.dispatchEvent(navigation);
  if (!navigation.defaultPrevented) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function useSmoothPageScroll() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
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
  const records = JSON.parse(localStorage.getItem('medihelpers_conversion_events') || '[]');
  records.push({ event, detail, path: getRoute(), createdAt: new Date().toISOString() });
  localStorage.setItem('medihelpers_conversion_events', JSON.stringify(records.slice(-100)));
}

function Link({ to, className = '', children, onClick }) {
  return <a href={to} className={className} onClick={(event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div ref={dialogRef} className={`modal-card ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={label} tabIndex="-1" data-lenis-prevent>
      <button className="modal-close" onClick={onClose} aria-label="닫기"><X /></button>
      {children}
    </div>
  </div>;
}

function Header({ path }) {
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <div className="nav-wrap">
      <Link className="brand" to="/" onClick={() => setOpen(false)} aria-label="메디헬퍼스 홈">
        <img src="/medihelpers-logo.svg" alt="메디헬퍼스" />
      </Link>
      <nav className={open ? 'open' : ''}>
        {navItems.map((item) => <Link key={item.path} to={item.path} onClick={() => setOpen(false)} className={`${path === item.path ? 'active' : ''} ${item.path === '/advertise' ? 'nav-ad' : ''}`}>{item.label}</Link>)}
      </nav>
      <div className="nav-actions">
        <a className="text-link" href="tel:0513425463"><Phone size={16} /> 051-342-5463</a>
        <Link className="button primary compact" to="/advertise">채용공고 등록</Link>
      </div>
      <button className="menu-btn" onClick={() => setOpen(!open)} aria-label="메뉴 열기">{open ? <X /> : <Menu />}</button>
    </div>
  </header>;
}

function Footer() {
  return <footer>
    <div className="footer-grid">
      <div className="footer-brand-block">
        <Link className="brand footer-logo" to="/"><img src="/medihelpers-logo.svg" alt="메디헬퍼스" /></Link>
        <p>의료기관과 의료인의 더 좋은 내일을<br />사람의 경험과 신뢰로 연결합니다.</p>
        <div className="footer-contact"><a href="tel:0513425463"><Phone size={15} /> 051-342-5463</a><a href="mailto:hr@medihelpers.co.kr"><Mail size={15} /> hr@medihelpers.co.kr</a></div>
      </div>
      <div className="footer-column"><strong>의료인</strong><Link to="/jobs">채용정보</Link><Link to="/headhunting">구직 상담</Link><Link to="/about">서비스 소개</Link></div>
      <div className="footer-column"><strong>의료기관</strong><Link to="/talent">인재정보</Link><Link to="/headhunting">채용 의뢰</Link><Link to="/advertise">광고센터</Link></div>
      <div className="footer-column"><strong>안내</strong><a href="mailto:hr@medihelpers.co.kr">문의하기</a><Link to="/about">개인정보 안내</Link><Link to="/about">이용약관</Link></div>
    </div>
    <div className="footer-bottom"><span>© 2026 MEDIHELPERS. All rights reserved.</span><span>부산광역시 북구 만덕대로 116번길 28</span></div>
  </footer>;
}

function PageHero({ eyebrow, title, description, children, tone = '' }) {
  return <section className={`page-hero ${tone}`}>
    <div className="page-hero-inner"><span className="eyebrow"><Sparkles size={15} /> {eyebrow}</span><h1>{title}</h1><p>{description}</p>{children}</div>
  </section>;
}

function HospitalLogo({ job, prominent = false }) {
  const hasBrandAsset = Boolean(job.logo || job.brandAsset);
  return <span className={`hospital-logo ${prominent ? 'prominent' : ''} ${hasBrandAsset ? 'has-image' : 'has-text'} ${job.brandAsset ? `brand-asset-${job.brandAsset}` : ''}`} style={{ '--logo-color': job.color }}>
    {job.brandAsset === 'bluecare' ? <span className="bluecare-brand" aria-label={`${job.hospital} 예시 로고`}><i className="bluecare-symbol"><b /><em /></i><span><strong>블루케어</strong><small>BLUECARE MEDICAL CENTER</small></span></span> : job.logo ? <img src={job.logo} alt={`${job.hospital} 로고`} /> : <b>{job.logoText || job.hospital.slice(0, 2)}</b>}
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
  const hasBrandAsset = Boolean(job.logo || job.brandAsset);
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
    {isAd ? <div className={`ad-brand-stage ${hasBrandAsset ? 'logo-stage' : 'wordmark-stage'}`}>
      <span className="ad-stage-label"><Sparkles size={14} /> {adLabel}</span>
      {hasBrandAsset ? <><HospitalLogo job={job} prominent /><div className="ad-hospital-caption"><strong>{job.hospital}</strong><small>병원 브랜드 채용관</small></div></> : <div className="hospital-wordmark"><small>MEDICAL CAREER PARTNER</small><strong>{job.hospital}</strong><span><i /> 병원 브랜드 채용관</span></div>}
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

function ConsultationForm({ initialRole = 'doctor', initialContext = '', initialProfession = '' }) {
  const [role, setRole] = useState(initialRole);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(null);
  const professionName = professions.find((item) => item.id === initialProfession)?.name || '';
  const [data, setData] = useState({ topic: initialProfession ? '직군 오픈 알림' : initialContext ? '특정 공고 문의' : '', department: professionName, region: '', workType: '', message: '', name: '', phone: '', contactMethod: '전화', contactTime: '상관없음' });
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
    const records = JSON.parse(localStorage.getItem('medihelpers_consultations') || '[]');
    records.push({ id, role, context: initialContext, profession: initialProfession, status: 'new', createdAt: new Date().toISOString(), ...data });
    localStorage.setItem('medihelpers_consultations', JSON.stringify(records));
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

function HomePage() {
  const [profession, setProfession] = useState('doctor');
  const [dept, setDept] = useState('전체 진료과');
  const [region, setRegion] = useState('전국');
  const search = () => profession === 'doctor' ? navigate(`/jobs?dept=${encodeURIComponent(dept)}&region=${encodeURIComponent(region)}`) : navigate(`/professions?profession=${profession}`);
  return <>
    <section className="home-hero">
      <div className="hero-copy"><span className="eyebrow"><Sparkles size={15} /> 모든 의료 커리어를 한곳에서</span><h1>의료인 채용,<br /><em>직군부터 정확하게.</em></h1><p>의사부터 간호·약무·방사선·임상병리·재활까지<br />내 전문영역을 선택하면 맞는 공간으로 연결됩니다.</p>
        <div className="hero-search-card" role="search" aria-label="의료 채용 검색">
          <div className="hero-search-title"><span><Search /></span><div><strong>내 전문영역의 채용 찾기</strong><small>직군·전문영역·지역만 선택하면 됩니다</small></div></div>
          <div className="hero-search-fields">
            <label><small>의료 직군</small><span><UsersRound size={19} /><select value={profession} onChange={(e) => setProfession(e.target.value)}>{professions.map((item) => <option key={item.id} value={item.id}>{item.short}</option>)}</select><ChevronDown size={16} /></span></label>
            <label><small>{profession === 'doctor' ? '진료과' : '전문영역'}</small><span><Stethoscope size={19} /><select value={profession === 'doctor' ? dept : '전체 전문영역'} disabled={profession !== 'doctor'} onChange={(e) => setDept(e.target.value)}>{profession === 'doctor' ? departments.map((item) => <option key={item}>{item}</option>) : <option>전체 전문영역</option>}</select><ChevronDown size={16} /></span></label>
            <label><small>지역</small><span><MapPin size={19} /><select value={region} onChange={(e) => setRegion(e.target.value)}>{regions.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={16} /></span></label>
            <button className="hero-search-button" onClick={search}>{profession === 'doctor' ? '채용정보 보기' : '직군 전용관 보기'} <ArrowRight /></button>
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

const professionIcons = { doctor: Stethoscope, nurse: HeartPulse, pharmacy: Pill, radiology: ScanLine, laboratory: Microscope, rehabilitation: Activity, dental: Smile, emergency: Ambulance };

function ProfessionsPage({ route }) {
  const params = new URLSearchParams(route.split('?')[1] || '');
  const [selected, setSelected] = useState(params.get('profession') || 'all');
  const visible = selected === 'all' ? professions : professions.filter((item) => item.id === selected);
  return <>
    <PageHero tone="profession" eyebrow="ONE HEALTHCARE NETWORK" title="하나로 연결하고, 직군별로 깊게" description="계정과 상담은 하나로 간단하게 이용하고 채용정보, 경력 기준, 익명 커뮤니티는 각 전문직군에 맞게 나눕니다."><Link className="button primary" to="/headhunting?profession=all">내 직군 오픈 알림 신청</Link></PageHero>
    <section className="section profession-section"><div className="profession-philosophy"><div><span className="section-kicker">UNIFIED, NOT MIXED</span><h2>모두 모으되<br />아무렇게나 섞지 않습니다</h2></div><p>간호사의 교대근무와 방사선사의 모달리티, 임상병리사의 검사분야, 치료사의 환자군은 서로 다른 정보입니다. 메디헬퍼스는 공통 계정과 결제·상담 시스템을 공유하면서 직군별 검색 기준과 커뮤니티를 독립적으로 운영합니다.</p></div><div className="profession-filter"><button className={selected === 'all' ? 'active' : ''} onClick={() => setSelected('all')}>전체 직군</button>{professions.map((item) => <button key={item.id} className={selected === item.id ? 'active' : ''} onClick={() => setSelected(item.id)}>{item.short}</button>)}</div><div className="profession-grid">{visible.map((item) => { const Icon = professionIcons[item.id]; return <article className={`profession-card ${item.status}`} key={item.id}><div className="profession-card-head"><span><Icon /></span><i>{item.status === 'active' ? '운영 중' : '파트너 모집'}</i></div><h3>{item.name}</h3><p>{item.description}</p><div className="specialty-tags">{item.specialties.map((tag) => <span key={tag}>{tag}</span>)}</div>{item.status === 'active' ? <Link className="button primary full" to="/jobs">채용정보 바로 보기 <ArrowRight /></Link> : <Link className="button outline full" to={`/headhunting?profession=${item.id}`}>오픈 알림·상담 신청 <ArrowRight /></Link>}</article>; })}</div></section>
    <section className="section soft community-plan"><div className="section-head"><div><span className="section-kicker">PROFESSIONAL COMMUNITY</span><h2>익명 커뮤니티도 직군별로 정확하게</h2><p>사람을 모으기 위한 잡담 게시판보다 실제 커리어 결정에 도움이 되는 정보부터 시작합니다.</p></div></div><div className="community-grid"><div><BadgeCheck /><h3>면허·자격 기반 인증</h3><p>이름은 익명으로 활동할 수 있지만 해당 직군 구성원인지 확인합니다.</p></div><div><WalletCards /><h3>급여·근무표 인사이트</h3><p>직군과 경력, 지역, 교대형태에 따라 조건을 비교합니다.</p></div><div><MessageCircle /><h3>실무 질문과 경험</h3><p>부서 이동, 장비 경험, 교육, 면접과 이직 경험을 나눕니다.</p></div><div><BriefcaseBusiness /><h3>대화에서 채용으로</h3><p>관심 있는 정보에서 익명 상담과 검증된 채용으로 자연스럽게 연결합니다.</p></div></div></section>
    <ConversionBanner title="당신의 직군도 메디헬퍼스에 필요합니다" description="먼저 참여한 의료인과 병원의 의견을 바탕으로 직군별 전용관을 순서대로 엽니다." />
  </>;
}

function JobsPage({ route }) {
  const params = new URLSearchParams(route.split('?')[1] || '');
  const [dept, setDept] = useState(params.get('dept') || '전체 진료과');
  const [region, setRegion] = useState(params.get('region') || '전국');
  const [keyword, setKeyword] = useState(params.get('keyword') || '');
  const [saved, setSaved] = useState(() => JSON.parse(localStorage.getItem('medihelpers_saved_jobs') || '[]'));
  const [selected, setSelected] = useState(() => jobs.find((job) => job.id === params.get('open')) || null);
  const filtered = useMemo(() => prioritizeJobs(jobs.filter((job) => (dept === '전체 진료과' || job.dept === dept || (dept === '전문의' && job.dept === '전문의')) && (region === '전국' || job.region === region) && (!keyword || `${job.hospital} ${job.title} ${job.summary} ${job.location} ${job.dept} ${job.type} ${job.schedule} ${job.pay} ${job.benefits.join(' ')}`.toLowerCase().includes(keyword.toLowerCase())))), [dept, region, keyword]);
  const promotedJobs = filtered.filter((job) => job.adTier);
  const standardJobs = filtered.filter((job) => !job.adTier);
  const toggleSaved = (id) => setSaved((current) => {
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    localStorage.setItem('medihelpers_saved_jobs', JSON.stringify(next));
    return next;
  });
  return <>
    <PageHero eyebrow="MEDICAL JOBS" title="조건부터 비교하는 의료 채용정보" description="현재 의사 채용정보를 우선 운영하고 있습니다. 다른 보건의료 직군은 전용관에서 오픈 알림을 신청할 수 있습니다."><Link className="button outline" to="/professions">전체 의료 직군 보기 <ArrowRight /></Link></PageHero>
    <section className="section jobs-page"><div className="filter-bar"><label><Stethoscope /><select value={dept} onChange={(e) => setDept(e.target.value)}>{departments.map((item) => <option key={item}>{item}</option>)}</select></label><label><MapPin /><select value={region} onChange={(e) => setRegion(e.target.value)}>{regions.map((item) => <option key={item}>{item}</option>)}</select></label><label className="filter-keyword"><Search /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="병원명, 근무조건 검색" /></label></div>
      <Link className="job-ad-banner" to="/advertise"><span>초기 파트너 모집</span><strong>검수된 의료인 채용공고를 등록하세요</strong><small>30일 59,000원부터 · 공고 문구 검수 지원</small><b>광고 상품 보기 <ArrowRight /></b></Link>
      <div className="result-row"><strong>{filtered.length}개의 채용공고</strong><span><Heart size={15} /> 관심공고 {saved.length}개</span></div>
      {filtered.length ? <>{promotedJobs.length > 0 && <div className="promoted-jobs"><div className="promotion-heading"><div><span><Crown /> PREMIUM PLACEMENT</span><strong>먼저 보는 집중채용</strong></div><small>집중채용 · 추천 광고 우선 노출</small></div><div className="job-grid promoted-grid">{promotedJobs.map((job) => <JobCard key={job.id} job={job} saved={saved.includes(job.id)} onSave={() => toggleSaved(job.id)} onOpen={() => { trackConversion('job_detail_open', { jobId: job.id }); setSelected(job); }} />)}</div></div>}{standardJobs.length > 0 && <div className="standard-jobs">{promotedJobs.length > 0 && <div className="standard-heading"><strong>전체 채용공고</strong><span>최신 등록순</span></div>}<div className="job-grid">{standardJobs.map((job) => <JobCard key={job.id} job={job} saved={saved.includes(job.id)} onSave={() => toggleSaved(job.id)} onOpen={() => { trackConversion('job_detail_open', { jobId: job.id }); setSelected(job); }} />)}</div></div>}<div className="decision-nudge"><div><span><Crown /> SMART ACCESS</span><h3>{saved.length ? `저장한 ${saved.length}개 공고, 우선순위부터 확인하세요` : '마음에 드는 공고 하나부터 깊게 확인하세요'}</h3><p>공개 정보로 먼저 비교하고, 결정에 필요한 급여와 상세조건만 건별로 열람할 수 있습니다.</p></div><Link className="button dark" to="/membership?type=doctor" onClick={() => trackConversion('jobs_membership_nudge', { savedCount: saved.length })}>2,900원부터 시작 <ArrowRight /></Link></div></> : <div className="empty-state"><Search /><h3>조건에 맞는 공고를 찾지 못했습니다</h3><p>검색 조건을 바꾸거나 헤드헌터에게 비공개 포지션을 문의해보세요.</p><button className="button primary" onClick={() => { setDept('전체 진료과'); setRegion('전국'); setKeyword(''); }}>검색 초기화</button></div>}
    </section>
    <ConversionBanner title="공개된 공고에 원하는 조건이 없나요?" description="등록되지 않은 비공개 포지션까지 함께 찾아드립니다." />
    {selected && <JobDetail job={selected} saved={saved.includes(selected.id)} onSave={() => toggleSaved(selected.id)} onClose={() => setSelected(null)} />}
  </>;
}

function TalentPage() {
  const [dept, setDept] = useState('전체 진료과');
  const visible = dept === '전체 진료과' ? talent : talent.filter((person) => person.dept === dept);
  return <>
    <PageHero tone="mint" eyebrow="VERIFIED TALENT" title="병원이 기다리는 익명 의료인 인재풀" description="후보자의 동의 전에는 개인정보를 공개하지 않습니다. 필요한 진료과와 조건을 알려주시면 전담 컨설턴트가 직접 연결합니다."><Link className="button primary" to="/headhunting?role=hospital">우리 병원 인재 추천받기</Link></PageHero>
    <section className="section"><div className="notice-bar"><ShieldCheck /><div><strong>안전한 익명 인재정보</strong><p>전문과·연차·희망 조건·입사 가능 시점까지 무료로 비교하세요. 검증 상세정보와 소개 요청은 필요한 후보에게만 사용할 수 있습니다.</p></div></div><div className="talent-toolbar"><div><span className="section-kicker">ACTIVE CANDIDATES</span><h2>최근 상담 완료 인재</h2></div><select value={dept} onChange={(e) => setDept(e.target.value)}>{departments.slice(0, -2).map((item) => <option key={item}>{item}</option>)}</select></div><div className="talent-grid">{visible.map((person) => <article className="talent-card" key={person.code}><div className="talent-top"><span className="avatar"><UserRound /></span><div><small>{person.code}</small><h3>{person.dept} · {person.career}</h3></div><BadgeCheck /></div><dl><div><dt>희망 지역</dt><dd>{person.region}</dd></div><div><dt>희망 조건</dt><dd>{person.preference}</dd></div><div><dt>입사 가능</dt><dd>{person.available}</dd></div></dl><div className="talent-lock-preview"><span><LockKeyhole /> 유료 상세정보</span><p>근무기관 이력 · 세부 술기 · 이직 사유 · 컨설턴트 확인 메모</p></div><Link className="button outline full" to={`/membership?type=hospital&candidate=${person.code}`} onClick={() => trackConversion('talent_intro_cta', { candidate: person.code })}>이 후보 소개 요청 · 39,000원</Link></article>)}</div></section>
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
    <PageHero tone="dark" eyebrow="PRIVATE CONSULTING" title="이직과 채용, 공개하기 전에 먼저 상담하세요" description="의료 채용 현장을 아는 전담 헤드헌터가 조건 정리부터 면접과 협상까지 한 사람처럼 함께합니다." />
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
    const records = JSON.parse(localStorage.getItem('medihelpers_ad_requests') || '[]');
    records.push({ id: `AD-${Date.now()}`, planId: plan.id, amount: plan.price, paymentMethod: method, status: 'payment-link-requested', createdAt: new Date().toISOString(), ...data });
    localStorage.setItem('medihelpers_ad_requests', JSON.stringify(records));
    setDone(true);
  };
  return <Modal onClose={onClose} wide label="병원 광고 상품 신청">{done ? <div className="checkout-success"><span><CircleCheck /></span><h2>광고 결제 요청이 접수되었습니다</h2><p>공고 내용과 병원 브랜드 정보를 확인한 뒤 결제 안내를 보내드립니다.<br />PG 연동 전까지는 이 단계에서 실제 금액이 청구되지 않습니다.</p><button className="button primary" onClick={onClose}>확인</button></div> : <><div className="checkout-title"><small>ADVERTISEMENT ORDER</small><h2>광고 상품 신청</h2><p>병원 브랜드와 채용정보를 함께 검수한 뒤 결제 링크와 게시 일정을 안내합니다.</p></div><form className="checkout-grid" onSubmit={submit}><div className="checkout-form"><div className="brand-upload"><div className="logo-preview">{logoPreview ? <img src={logoPreview} alt="선택한 병원 로고 미리보기" /> : <Building2 />}</div><label><span>병원 로고 <i>선택 · 권장</i></span><input name="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={selectLogo} /><div className="upload-button"><Upload /><div><strong>{logoName || '로고 파일 선택'}</strong><small>PNG·JPG·WEBP, 최대 5MB</small></div></div>{logoError && <em>{logoError}</em>}</label></div><div className="form-grid"><label><span>병원명 *</span><input required name="hospital" placeholder="병원명을 입력해주세요" /></label><label><span>기관 유형 *</span><select required name="facilityType" defaultValue=""><option value="" disabled>기관 유형 선택</option><option>종합병원</option><option>병원</option><option>요양병원</option><option>한방병원</option><option>의원</option><option>검진·전문센터</option><option>기타 의료기관</option></select></label><label><span>담당자명 *</span><input required name="manager" placeholder="담당자 성함" /></label><label><span>연락처 *</span><input required name="phone" type="tel" placeholder="010-0000-0000" /></label><label><span>이메일 *</span><input required name="email" type="email" placeholder="billing@hospital.co.kr" /></label><label><span>병원 위치 *</span><input required name="address" placeholder="예: 부산광역시 연제구" /></label></div><label className="wide-field"><span>채용 직군·전문영역 *</span><input required name="department" placeholder="예: 정형외과 전문의, 방사선사 CT" /></label><label className="wide-field"><span>병원·채용 소개 <i>선택</i></span><textarea name="introduction" rows="3" placeholder="진료 환경, 기관의 강점, 채용 인원과 일정을 간단히 적어주세요." /></label><div className="payment-choice"><span>결제 안내 방식</span><div><button type="button" className={method === 'card' ? 'active' : ''} onClick={() => setMethod('card')}><CreditCard /> 카드 결제 링크</button><button type="button" className={method === 'transfer' ? 'active' : ''} onClick={() => setMethod('transfer')}><Banknote /> 계좌이체·세금계산서</button></div></div><label className="consent"><input required type="checkbox" name="terms" value="agreed" /><span>광고 검수, 결제 안내 및 개인정보 수집·이용에 동의합니다. 병원 로고는 사용 권한을 확인한 파일만 등록합니다.</span></label></div><aside className="order-summary"><small>선택한 상품</small><h3>{plan.name}</h3><p>{plan.unit} 노출</p><ul>{plan.features.map((item) => <li key={item}><Check />{item}</li>)}</ul><div className="price-row"><span>결제 예정금액<small>부가세 포함</small></span><strong>{plan.price.toLocaleString()}원</strong></div><button className="button primary full" type="submit">결제 안내 요청하기 <ArrowRight size={17} /></button><p className="secure-note"><ShieldCheck /> 실제 결제는 공고 검수 후 진행됩니다.</p></aside></form></>}</Modal>;
}

function AdvertisePage() {
  const [plan, setPlan] = useState(null);
  return <>
    <PageHero tone="ad" eyebrow="HOSPITAL AD CENTER" title="좋은 의료인에게 먼저 닿는 채용광고" description="초기 파트너 가격 59,000원부터 시작합니다. 공고만 올리는 광고부터 전담 컨설턴트가 후보를 찾는 집중 채용까지 필요한 만큼 선택하세요."><a className="button light" href="#plans">광고 상품 비교</a></PageHero>
    <section className="section"><div className="metrics-strip"><div><TrendingUp /><strong>진료과 중심 노출</strong><span>관심 가능성이 높은 의료인에게</span></div><div><FileCheck2 /><strong>공고 검수 지원</strong><span>신뢰도 높은 조건과 문구로</span></div><div><UserRoundSearch /><strong>인재 추천 연결</strong><span>광고와 헤드헌팅을 유연하게</span></div></div></section>
    <section className="section ad-preview-section" id="ad-preview"><div className="ad-preview-copy"><span className="section-kicker">LIVE AD PREVIEW</span><h2>로고를 등록하면<br />이렇게 먼저 보입니다</h2><p>집중채용 상품의 실제 노출 형태를 미리 확인하세요. 병원 로고를 중심에 두고 광고 등급, 채용 분야, 근무 조건이 자연스럽게 이어집니다.</p><ul><li><Check /> 병원 로고를 카드의 중심 브랜드 자산으로 노출</li><li><Check /> 집중채용 등급은 목록 최상단 우선 배치</li><li><Check /> 과하지 않은 광원과 깊이감으로 시선 유도</li></ul><button className="button primary" onClick={() => setPlan(adPlans[2])}>집중채용 광고 신청 <ArrowRight /></button></div><div className="ad-preview-frame"><span className="preview-disclaimer"><ShieldCheck /> 디자인 예시 · 실제 공고 아님</span><JobCard job={advertisementPreviewJob} preview saved={false} onSave={() => {}} onOpen={() => setPlan(adPlans[2])} /></div></section>
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
    const records = JSON.parse(localStorage.getItem('medihelpers_membership_requests') || '[]');
    records.push({ id: `MEM-${Date.now()}`, planId: plan.id, amount: plan.price, status: 'payment-link-requested', createdAt: new Date().toISOString(), ...data });
    localStorage.setItem('medihelpers_membership_requests', JSON.stringify(records));
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
    <section className="section membership-section"><div className="membership-tabs"><button className={type === 'doctor' ? 'active' : ''} onClick={() => setType('doctor')}><Stethoscope /> 의료인용</button><button className={type === 'hospital' ? 'active' : ''} onClick={() => setType('hospital')}><Building2 /> 병원용</button></div>{contextId && <div className="context-offer"><div><span><CircleCheck /> 무료 미리보기 확인 완료</span><h3>{type === 'doctor' ? '선택한 공고의 핵심조건만 바로 열어보세요' : '선택한 후보의 검증정보와 소개를 요청하세요'}</h3><p>{type === 'doctor' ? '상세 급여·당직·협의조건을 한 번에 확인합니다.' : '후보자 동의 확인부터 첫 인터뷰 연결까지 지원합니다.'}</p></div><button className="button primary" onClick={() => { trackConversion('context_single_offer', { type, contextId }); setSelected(contextPlan); }}>{contextPlan.price.toLocaleString()}원으로 계속</button></div>}<div className="access-explain"><div><span className="access-number">FREE</span><h3>무료로 충분히 비교</h3><p>{type === 'doctor' ? '진료과, 지역, 기본 근무형태와 공개 공고' : '진료과, 경력 연차, 희망 지역과 입사 가능 시점'}</p></div><ArrowRight /><div className="paid-access"><span className="access-number">UNLOCK</span><h3>결정할 때만 결제</h3><p>{type === 'doctor' ? '상세 급여, 정확한 근무시간, 비공개 병원·포지션' : '검증 경력, 세부 술기, 동의 기반 소개 요청'}</p></div></div><ValueCalculator key={type} type={type} onChoose={setSelected} /><div className="membership-grid">{plans.map((plan) => <article className={`membership-card ${plan.featured ? 'featured' : ''}`} key={plan.id}>{plan.featured && <span className="popular">추천</span>}<small>{plan.period === '월' ? 'MONTHLY PASS' : 'ONE-TIME ACCESS'}</small><h2>{plan.name}</h2><p>{plan.description}</p><div className="price"><strong>{plan.price.toLocaleString()}</strong><span>원 / {plan.period}</span></div><ul>{plan.features.map((feature) => <li key={feature}><Check /> {feature}</li>)}</ul><button className={`button ${plan.featured ? 'primary' : 'outline'} full`} onClick={() => { trackConversion('membership_plan_select', { planId: plan.id }); setSelected(plan); }}>이용권 신청</button></article>)}</div><div className="privacy-gate"><ShieldCheck /><div><strong>결제해도 개인정보를 바로 판매하지 않습니다</strong><p>병원은 검증된 익명 정보를 열람하고 소개를 요청합니다. 의료인의 명시적 동의가 확인된 뒤에만 필요한 범위의 정보가 전달됩니다.</p></div></div></section>
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
  else if (path === '/professions') page = <ProfessionsPage route={route} />;
  else if (path === '/talent') page = <TalentPage />;
  else if (path === '/headhunting') page = <HeadhuntingPage route={route} />;
  else if (path === '/advertise') page = <AdvertisePage />;
  else if (path === '/membership') page = <MembershipPage route={route} />;
  else if (path === '/about') page = <AboutPage />;
  else page = <NotFoundPage />;
  return <div className="app"><div className="scroll-progress" aria-hidden="true" /><Header path={path} /><main>{page}</main><Footer /><div className="mobile-quickbar"><Link to="/jobs"><Search />채용 찾기</Link><Link className="mobile-ad" to="/advertise"><Building2 />공고 등록</Link></div></div>;
}
