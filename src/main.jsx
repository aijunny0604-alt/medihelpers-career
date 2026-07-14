import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Banknote, BriefcaseBusiness, Building2,
  CalendarDays, Check, ChevronDown, CircleCheck, ClipboardCheck, Clock3,
  CreditCard, Crown, FileCheck2, Heart, LockKeyhole, Mail, MapPin, Menu, MessageCircle, Phone,
  Search, ShieldCheck, Sparkles, Stethoscope, Target, TrendingUp, UserRound,
  UserRoundSearch, UsersRound, WalletCards, X
} from 'lucide-react';
import { adPlans, jobs, membershipPlans, navItems, talent } from './data.js';

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

function navigate(path) {
  if (getRoute() !== path) window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function Link({ to, className = '', children, onClick }) {
  return <a href={to} className={className} onClick={(event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onClick?.();
    navigate(to);
  }}>{children}</a>;
}

function Modal({ children, onClose, wide = false }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.body.classList.add('modal-open');
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className={`modal-card ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
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

function JobCard({ job, saved, onSave, onOpen }) {
  const premium = ['집중채용', '추천', '비공개'].includes(job.badge);
  return <article className="job-card">
    <div className="job-top"><span className="tag" style={{ color: job.color, background: `${job.color}12` }}>{job.badge}</span><button className={saved ? 'heart saved' : 'heart'} onClick={onSave} aria-label="관심 공고 저장"><Heart size={20} fill={saved ? 'currentColor' : 'none'} /></button></div>
    <div className="hospital"><span className="hospital-logo" style={{ background: job.color }}>{job.hospital[0]}</span><span>{job.hospital}</span></div>
    <h3>{job.title}</h3>
    <div className="meta"><span><MapPin size={15} />{job.location}</span><span><Clock3 size={15} />{job.schedule}</span></div>
    <div className="job-bottom"><span>{job.dept}</span><strong className={premium ? 'premium-value' : ''}>{premium ? <><LockKeyhole /> 멤버십 전용</> : job.pay}</strong></div>
    <button className="card-action" onClick={onOpen}>공고 자세히 보기 <ArrowRight size={16} /></button>
  </article>;
}

function JobDetail({ job, saved, onSave, onClose }) {
  const premium = ['집중채용', '추천', '비공개'].includes(job.badge);
  return <Modal onClose={onClose} wide>
    <div className="detail-heading"><span className="tag" style={{ color: job.color, background: `${job.color}12` }}>{job.badge}</span><p>{job.hospital}</p><h2>{job.title}</h2><div className="meta large"><span><MapPin size={17} />{job.location}</span><span><Clock3 size={17} />{job.schedule}</span><span><CalendarDays size={17} />{job.updated} 업데이트</span></div></div>
    <div className="detail-grid">
      <div><h3>포지션 소개</h3><p>{job.summary}</p><h3>주요 조건</h3><div className="benefit-list">{job.benefits.map((item) => <span key={item}><Check size={15} />{item}</span>)}</div></div>
      <aside className={premium ? 'premium-aside' : ''}><span>예상 보수</span>{premium ? <div className="locked-value"><LockKeyhole /><strong>멤버십 전용 정보</strong><small>상세 급여, 병원 담당자, 정확한 진료조건을 확인할 수 있습니다.</small><Link className="button primary full" to="/membership?type=doctor">열람권 확인</Link></div> : <><strong>{job.pay}</strong><small>경력과 진료 범위에 따라 조율합니다.</small><Link className="button primary full" to={`/headhunting?job=${job.id}`}>비공개 상담 신청</Link></>}<button className="button outline full" onClick={onSave}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /> {saved ? '관심공고 저장됨' : '관심공고 저장'}</button></aside>
    </div>
  </Modal>;
}

function ConsultationForm({ initialRole = 'doctor', compact = false }) {
  const [role, setRole] = useState(initialRole);
  const [submitted, setSubmitted] = useState(false);
  const submit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const records = JSON.parse(localStorage.getItem('medihelpers_consultations') || '[]');
    records.push({ id: Date.now(), role, createdAt: new Date().toISOString(), ...Object.fromEntries(form.entries()) });
    localStorage.setItem('medihelpers_consultations', JSON.stringify(records));
    setSubmitted(true);
  };
  if (submitted) return <div className="form-success"><span><CircleCheck /></span><h3>상담 요청이 접수되었습니다</h3><p>입력해주신 연락처로 담당 헤드헌터가 확인 후 연락드리겠습니다.</p><a className="button primary" href="tel:0513425463">지금 전화하기</a></div>;
  return <form className={`consult-form ${compact ? 'compact' : ''}`} onSubmit={submit}>
    <div className="role-tabs"><button type="button" className={role === 'doctor' ? 'active' : ''} onClick={() => setRole('doctor')}><Stethoscope size={18} /> 의료인 구직 상담</button><button type="button" className={role === 'hospital' ? 'active' : ''} onClick={() => setRole('hospital')}><Building2 size={18} /> 병원 채용 상담</button></div>
    <input type="hidden" name="role" value={role} />
    <div className="form-grid">
      <label><span>{role === 'doctor' ? '성함' : '병원명'} *</span><input name="name" required placeholder={role === 'doctor' ? '성함을 입력해주세요' : '병원명을 입력해주세요'} /></label>
      <label><span>연락처 *</span><input name="phone" type="tel" required placeholder="010-0000-0000" /></label>
      <label><span>{role === 'doctor' ? '진료과' : '채용 진료과'} *</span><input name="department" required placeholder="예: 내과" /></label>
      <label><span>{role === 'doctor' ? '희망 지역' : '병원 지역'}</span><input name="region" placeholder="예: 부산·경남" /></label>
    </div>
    <label className="wide-field"><span>상담 내용</span><textarea name="message" rows="4" placeholder={role === 'doctor' ? '희망 근무조건이나 고민을 편하게 적어주세요.' : '채용 일정, 근무조건, 필요한 경력을 알려주세요.'} /></label>
    <label className="consent"><input type="checkbox" required name="privacy" value="agreed" /><span>상담을 위한 개인정보 수집·이용에 동의합니다. 입력 정보는 상담 목적에만 사용됩니다.</span></label>
    <button className="button primary full" type="submit">무료 상담 요청하기 <ArrowRight size={17} /></button>
    <p className="form-note"><ShieldCheck size={14} /> 의료인 정보는 동의 없이 병원에 공개하지 않습니다.</p>
  </form>;
}

function QuickAccess() {
  return <section className="quick-access" aria-label="빠른 메뉴">
    <div className="quick-find">
      <div className="quick-label"><Search /><span><strong>바로 찾기</strong><small>원하는 조건을 한 번에</small></span></div>
      <div className="quick-chips">
        <Link to="/jobs?keyword=주%204일">주 4일</Link>
        <Link to="/jobs?keyword=검진센터">검진센터</Link>
        <Link to="/jobs?region=서울">서울</Link>
        <Link to="/jobs?region=부산">부산</Link>
        <Link to="/jobs">전체 채용</Link>
      </div>
    </div>
    <Link className="quick-consult" to="/headhunting">
      <span><MessageCircle /></span><div><small>의료인 전용</small><strong>비공개 구직 상담</strong><p>이직 결정 전에도 무료</p></div><ArrowRight />
    </Link>
    <Link className="quick-ad" to="/advertise">
      <span className="ad-label">병원 전용 · 광고</span><div><strong>채용공고 등록</strong><p>99,000원부터 시작</p></div><ArrowRight />
    </Link>
  </section>;
}

function MemberTeaser() {
  return <section className="member-teaser"><div className="member-icon"><Crown /></div><div><small>MEDIHELPERS MEMBERSHIP</small><h2>둘러보기는 무료, 결정에 필요한 핵심정보는 멤버십으로</h2><p>의료인은 프리미엄 공고를, 병원은 검증된 인재정보와 소개 요청권을 이용할 수 있습니다.</p></div><Link className="button dark" to="/membership">멤버십 비교 <ArrowRight /></Link></section>;
}

function HomePage() {
  const [dept, setDept] = useState('전체 진료과');
  const [region, setRegion] = useState('전국');
  const [keyword, setKeyword] = useState('');
  const search = () => navigate(`/jobs?dept=${encodeURIComponent(dept)}&region=${encodeURIComponent(region)}&keyword=${encodeURIComponent(keyword)}`);
  return <>
    <section className="home-hero">
      <div className="hero-copy"><span className="eyebrow"><Sparkles size={15} /> 쉽고 빠른 의료 채용</span><h1>원하는 의료 채용,<br /><em>쉽고 빠르게</em> 찾으세요</h1><p>진료과와 지역만 고르면 바로 찾을 수 있습니다.<br />어려운 조건은 전담 헤드헌터에게 편하게 물어보세요.</p>
        <div className="search-panel">
          <label><Stethoscope size={20} /><select value={dept} onChange={(e) => setDept(e.target.value)}>{departments.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={17} /></label>
          <label><MapPin size={20} /><select value={region} onChange={(e) => setRegion(e.target.value)}>{regions.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={17} /></label>
          <label className="keyword"><Search size={20} /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="병원명 또는 키워드" /></label>
          <button className="button primary" onClick={search}>채용 검색</button>
        </div>
        <div className="hero-links"><span>무엇을 찾으세요?</span><Link to="/jobs">채용정보</Link><Link to="/headhunting">비공개 상담</Link><Link to="/advertise">공고 등록</Link></div>
      </div>
      <div className="concierge-card">
        <div className="concierge-head"><span><UserRoundSearch /></span><div><small>MEDIHELPERS CONCIERGE</small><strong>1:1 커리어 매칭</strong></div><i>LIVE</i></div>
        <div className="match-score"><div className="score-ring"><strong>92</strong><span>%</span></div><div><small>조건 적합도 분석</small><h3>선생님에게 맞는<br />새 포지션이 도착했어요</h3></div></div>
        <div className="mini-position"><span className="mini-icon blue"><Building2 /></span><div><small>추천 포지션 · NEW</small><strong>소화기내과 전문의 초빙</strong><p><MapPin size={13} /> 서울 강남 · 주 4.5일</p></div><b>98%</b></div>
        <div className="mini-position"><span className="mini-icon mint"><BriefcaseBusiness /></span><div><small>비공개 포지션</small><strong>검진센터 진료의</strong><p><MapPin size={13} /> 부산 해운대 · 정규직</p></div><b>91%</b></div>
        <div className="concierge-foot"><CircleCheck size={16} /> 상담부터 조건 협상까지 함께합니다</div>
      </div>
    </section>
    <QuickAccess />
    <MemberTeaser />
    <section className="section soft"><div className="section-head"><div><span className="section-kicker">CURATED POSITIONS</span><h2>지금 주목할 채용</h2><p>조건과 신뢰도를 확인한 포지션을 먼저 소개합니다.</p></div><Link className="button outline" to="/jobs">전체 채용 보기 <ArrowRight size={17} /></Link></div><div className="job-grid">{jobs.slice(0, 3).map((job) => <JobCard key={job.id} job={job} saved={false} onSave={() => {}} onOpen={() => navigate(`/jobs?open=${job.id}`)} />)}</div></section>
    <section className="dual-path section"><div className="path-card doctor"><span className="path-icon"><Stethoscope /></span><small>의료인이라면</small><h2>내 조건을 먼저 말하고<br />비공개 제안을 받으세요</h2><p>이력서를 공개하지 않아도 전담 헤드헌터가 적합한 병원을 찾아드립니다.</p><ul><li><Check /> 개인정보 비공개</li><li><Check /> 연봉·근무조건 협상</li><li><Check /> 입사 후 피드백</li></ul><Link className="button dark" to="/headhunting">구직 상담 시작</Link></div><div className="path-card hospital"><span className="path-icon"><Building2 /></span><small>의료기관이라면</small><h2>광고와 인재 추천을<br />한 번에 시작하세요</h2><p>공고 등록부터 후보 발굴, 면접 일정까지 필요한 만큼 선택할 수 있습니다.</p><ul><li><Check /> 전문과목별 인재풀</li><li><Check /> 검증된 채용공고</li><li><Check /> 성과형 헤드헌팅</li></ul><Link className="button light" to="/advertise">광고 상품 보기</Link></div></section>
    <section className="section process"><div className="section-head centered"><div><span className="section-kicker">HOW IT WORKS</span><h2>사람이 끝까지 책임지는 매칭</h2><p>정보를 나열하는 데서 멈추지 않고 실제 결정까지 함께합니다.</p></div></div><div className="step-grid">{[[MessageCircle,'01','조건 상담','원하는 지역과 근무조건, 채용 일정을 듣습니다.'],[Target,'02','정밀 연결','공개·비공개 포지션과 검증된 인재를 선별합니다.'],[ClipboardCheck,'03','조건 조율','면접 일정과 보수, 근무조건 협상을 지원합니다.'],[CircleCheck,'04','새로운 시작','입사와 채용 완료 후에도 적응을 확인합니다.']].map(([Icon,n,t,d]) => <div className="step" key={n}><span>{n}</span><Icon /><h3>{t}</h3><p>{d}</p></div>)}</div></section>
    <ConversionBanner />
  </>;
}

function JobsPage({ route }) {
  const params = new URLSearchParams(route.split('?')[1] || '');
  const [dept, setDept] = useState(params.get('dept') || '전체 진료과');
  const [region, setRegion] = useState(params.get('region') || '전국');
  const [keyword, setKeyword] = useState(params.get('keyword') || '');
  const [saved, setSaved] = useState(() => JSON.parse(localStorage.getItem('medihelpers_saved_jobs') || '[]'));
  const [selected, setSelected] = useState(() => jobs.find((job) => job.id === params.get('open')) || null);
  const filtered = useMemo(() => jobs.filter((job) => (dept === '전체 진료과' || job.dept === dept || (dept === '전문의' && job.dept === '전문의')) && (region === '전국' || job.region === region) && (!keyword || `${job.hospital} ${job.title} ${job.summary} ${job.location} ${job.dept} ${job.type} ${job.schedule} ${job.pay} ${job.benefits.join(' ')}`.toLowerCase().includes(keyword.toLowerCase()))), [dept, region, keyword]);
  const toggleSaved = (id) => setSaved((current) => {
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    localStorage.setItem('medihelpers_saved_jobs', JSON.stringify(next));
    return next;
  });
  return <>
    <PageHero eyebrow="MEDICAL JOBS" title="조건부터 비교하는 의료 채용정보" description="진료과와 지역, 실제 근무조건을 확인하고 궁금한 공고는 전담 헤드헌터에게 비공개로 물어보세요." />
    <section className="section jobs-page"><div className="filter-bar"><label><Stethoscope /><select value={dept} onChange={(e) => setDept(e.target.value)}>{departments.map((item) => <option key={item}>{item}</option>)}</select></label><label><MapPin /><select value={region} onChange={(e) => setRegion(e.target.value)}>{regions.map((item) => <option key={item}>{item}</option>)}</select></label><label className="filter-keyword"><Search /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="병원명, 근무조건 검색" /></label></div>
      <Link className="job-ad-banner" to="/advertise"><span>병원 채용 담당자라면</span><strong>여기에 채용공고를 등록하세요</strong><small>30일 99,000원부터 · 공고 문구 검수 지원</small><b>광고 상품 보기 <ArrowRight /></b></Link>
      <div className="result-row"><strong>{filtered.length}개의 채용공고</strong><span><Heart size={15} /> 관심공고 {saved.length}개</span></div>
      {filtered.length ? <div className="job-grid">{filtered.map((job) => <JobCard key={job.id} job={job} saved={saved.includes(job.id)} onSave={() => toggleSaved(job.id)} onOpen={() => setSelected(job)} />)}</div> : <div className="empty-state"><Search /><h3>조건에 맞는 공고를 찾지 못했습니다</h3><p>검색 조건을 바꾸거나 헤드헌터에게 비공개 포지션을 문의해보세요.</p><button className="button primary" onClick={() => { setDept('전체 진료과'); setRegion('전국'); setKeyword(''); }}>검색 초기화</button></div>}
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
    <section className="section"><div className="notice-bar"><ShieldCheck /><div><strong>안전한 익명 인재정보</strong><p>기본 조건은 무료로 확인하고, 상세 경력과 소개 요청은 병원 멤버십으로 이용합니다. 실제 후보자는 본인 동의 후에만 소개됩니다.</p></div></div><div className="talent-toolbar"><div><span className="section-kicker">ACTIVE CANDIDATES</span><h2>최근 상담 완료 인재</h2></div><select value={dept} onChange={(e) => setDept(e.target.value)}>{departments.slice(0, -2).map((item) => <option key={item}>{item}</option>)}</select></div><div className="talent-grid">{visible.map((person) => <article className="talent-card" key={person.code}><div className="talent-top"><span className="avatar"><UserRound /></span><div><small>{person.code}</small><h3>{person.dept} · {person.career}</h3></div><BadgeCheck /></div><dl><div><dt>희망 지역</dt><dd>{person.region}</dd></div><div><dt>희망 조건</dt><dd>{person.preference}</dd></div><div><dt>상세 경력</dt><dd className="locked-text"><LockKeyhole /> 멤버십 전용</dd></div></dl><Link className="button outline full" to="/membership?type=hospital">소개 요청권 확인</Link></article>)}</div></section>
    <section className="section soft"><div className="feature-grid"><div><UserRoundSearch /><h3>조건 기반 후보 탐색</h3><p>진료과뿐 아니라 지역, 근무형태, 입사 가능 시점까지 확인합니다.</p></div><div><FileCheck2 /><h3>경력·자격 사전 확인</h3><p>후보자가 제공한 경력과 자격 정보를 소개 전에 점검합니다.</p></div><div><ShieldCheck /><h3>동의 기반 정보 공개</h3><p>양측의 의사를 확인한 뒤 필요한 범위의 정보만 전달합니다.</p></div></div></section>
    <ConversionBanner title="찾는 인재가 따로 있으신가요?" description="채용 조건을 남기면 공개되지 않은 인재풀까지 확인해드립니다." hospital />
  </>;
}

function HeadhuntingPage({ route }) {
  const params = new URLSearchParams(route.split('?')[1] || '');
  const role = params.get('role') === 'hospital' ? 'hospital' : 'doctor';
  return <>
    <PageHero tone="dark" eyebrow="PRIVATE CONSULTING" title="이직과 채용, 공개하기 전에 먼저 상담하세요" description="의료 채용 현장을 아는 전담 헤드헌터가 조건 정리부터 면접과 협상까지 한 사람처럼 함께합니다." />
    <section className="section consultation-layout"><div className="consult-copy"><span className="section-kicker">1:1 CONCIERGE</span><h2>광고보다 먼저,<br />상황을 정확히 듣습니다</h2><p>같은 진료과라도 원하는 삶과 병원의 사정은 다릅니다. 메디헬퍼스는 숫자만 맞추지 않고 오래 만족할 수 있는 연결을 찾습니다.</p><div className="consult-points"><div><span><Phone /></span><div><strong>빠른 첫 연락</strong><p>접수 내용을 확인하고 가능한 시간에 연락드립니다.</p></div></div><div><span><ShieldCheck /></span><div><strong>철저한 비공개</strong><p>동의 전에는 이직 의사와 병원 내부정보를 공개하지 않습니다.</p></div></div><div><span><TrendingUp /></span><div><strong>실제 조건 협상</strong><p>보수, 일정, 업무범위를 구체적으로 조율합니다.</p></div></div></div><div className="direct-contact"><small>바로 상담하고 싶다면</small><a href="tel:0513425463">051-342-5463</a><span>평일 09:00–18:00</span></div></div><ConsultationForm key={role} initialRole={role} /></section>
    <section className="section soft"><div className="section-head centered"><div><span className="section-kicker">TWO-SIDED SERVICE</span><h2>의료인과 병원, 서로 다른 고민을 해결합니다</h2></div></div><div className="compare-grid"><div><Stethoscope /><h3>의료인에게</h3><ul><li><Check /> 공개하지 않고 이직 가능성 확인</li><li><Check /> 비공개 포지션과 실제 근무조건 안내</li><li><Check /> 연봉·진료범위·스케줄 협상 지원</li><li><Check /> 퇴사와 입사 일정 조율</li></ul></div><div><Building2 /><h3>의료기관에게</h3><ul><li><Check /> 채용조건 정리와 공고 문구 개선</li><li><Check /> 익명 인재풀 후보 발굴</li><li><Check /> 면접 일정과 후보 피드백 관리</li><li><Check /> 광고 또는 성공보수 방식 선택</li></ul></div></div></section>
  </>;
}

function Checkout({ plan, onClose }) {
  const [done, setDone] = useState(false);
  const [method, setMethod] = useState('card');
  const submit = (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const records = JSON.parse(localStorage.getItem('medihelpers_ad_requests') || '[]');
    records.push({ id: `AD-${Date.now()}`, planId: plan.id, amount: plan.price, paymentMethod: method, status: 'payment-link-requested', createdAt: new Date().toISOString(), ...data });
    localStorage.setItem('medihelpers_ad_requests', JSON.stringify(records));
    setDone(true);
  };
  return <Modal onClose={onClose} wide>{done ? <div className="checkout-success"><span><CircleCheck /></span><h2>광고 결제 요청이 접수되었습니다</h2><p>공고 내용 확인 후 선택하신 방식에 맞는 결제 안내를 보내드립니다.<br />PG 연동 전까지는 이 단계에서 실제 금액이 청구되지 않습니다.</p><button className="button primary" onClick={onClose}>확인</button></div> : <><div className="checkout-title"><small>ADVERTISEMENT ORDER</small><h2>광고 상품 신청</h2><p>공고 검수 후 안전한 결제 링크와 게시 일정을 안내합니다.</p></div><form className="checkout-grid" onSubmit={submit}><div className="checkout-form"><div className="form-grid"><label><span>병원명 *</span><input required name="hospital" placeholder="병원명을 입력해주세요" /></label><label><span>담당자명 *</span><input required name="manager" placeholder="담당자 성함" /></label><label><span>연락처 *</span><input required name="phone" type="tel" placeholder="010-0000-0000" /></label><label><span>이메일 *</span><input required name="email" type="email" placeholder="billing@hospital.co.kr" /></label></div><label className="wide-field"><span>채용 진료과 *</span><input required name="department" placeholder="예: 정형외과 전문의" /></label><div className="payment-choice"><span>결제 안내 방식</span><div><button type="button" className={method === 'card' ? 'active' : ''} onClick={() => setMethod('card')}><CreditCard /> 카드 결제 링크</button><button type="button" className={method === 'transfer' ? 'active' : ''} onClick={() => setMethod('transfer')}><Banknote /> 계좌이체·세금계산서</button></div></div><label className="consent"><input required type="checkbox" name="terms" value="agreed" /><span>광고 검수, 결제 안내 및 개인정보 수집·이용에 동의합니다.</span></label></div><aside className="order-summary"><small>선택한 상품</small><h3>{plan.name}</h3><p>{plan.unit} 노출</p><ul>{plan.features.map((item) => <li key={item}><Check />{item}</li>)}</ul><div className="price-row"><span>결제 예정금액<small>부가세 포함</small></span><strong>{plan.price.toLocaleString()}원</strong></div><button className="button primary full" type="submit">결제 안내 요청하기 <ArrowRight size={17} /></button><p className="secure-note"><ShieldCheck /> 실제 결제는 공고 검수 후 진행됩니다.</p></aside></form></>}</Modal>;
}

function AdvertisePage() {
  const [plan, setPlan] = useState(null);
  return <>
    <PageHero tone="ad" eyebrow="HOSPITAL AD CENTER" title="좋은 의료인에게 먼저 닿는 채용광고" description="공고만 올리는 광고부터 전담 컨설턴트가 후보를 찾는 집중 채용까지, 병원의 일정과 예산에 맞게 선택하세요."><a className="button light" href="#plans">광고 상품 비교</a></PageHero>
    <section className="section"><div className="metrics-strip"><div><TrendingUp /><strong>진료과 중심 노출</strong><span>관심 가능성이 높은 의료인에게</span></div><div><FileCheck2 /><strong>공고 검수 지원</strong><span>신뢰도 높은 조건과 문구로</span></div><div><UserRoundSearch /><strong>인재 추천 연결</strong><span>광고와 헤드헌팅을 유연하게</span></div></div></section>
    <section className="section soft" id="plans"><div className="section-head centered"><div><span className="section-kicker">AD PRODUCTS</span><h2>병원 채용 상황에 맞는 광고 상품</h2><p>초기 가격안이며 실제 결제 전 담당자가 기간과 조건을 다시 확인합니다.</p></div></div><div className="pricing-grid">{adPlans.map((item) => <article className={`price-card ${item.featured ? 'featured' : ''}`} key={item.id}>{item.featured && <span className="popular">가장 많이 선택</span>}<small>{item.label}</small><h3>{item.name}</h3><p>{item.description}</p><div className="price"><strong>{item.price.toLocaleString()}</strong><span>원 / {item.unit}</span></div><ul>{item.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul><button className={`button ${item.featured ? 'primary' : 'outline'} full`} onClick={() => setPlan(item)}>이 상품 신청하기</button></article>)}</div><div className="headhunt-plan"><div><span><UsersRound /></span><div><small>SUCCESS-BASED RECRUITING</small><h3>공고만으로 어려운 채용은 전담 헤드헌팅</h3><p>필요한 진료과와 조건을 바탕으로 후보 발굴부터 협상까지 맡아드립니다.</p></div></div><Link className="button dark" to="/headhunting?role=hospital">별도 견적 상담</Link></div></section>
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
    setDone(true);
  };
  return <Modal onClose={onClose}>{done ? <div className="checkout-success"><span><CircleCheck /></span><h2>멤버십 결제 요청이 접수되었습니다</h2><p>회원 유형과 자격을 확인한 뒤 안전한 결제 링크를 보내드립니다.<br />현재는 실제 금액이 청구되지 않습니다.</p><button className="button primary" onClick={onClose}>확인</button></div> : <div className="membership-checkout"><small>MEMBERSHIP ORDER</small><h2>{plan.name}</h2><p>{plan.description}</p><div className="membership-price"><strong>{plan.price.toLocaleString()}원</strong><span>/ {plan.period}</span></div><form onSubmit={submit}><label><span>{plan.audience === 'doctor' ? '의료인 성함' : '병원명'} *</span><input required name="name" /></label><label><span>연락처 *</span><input required name="phone" type="tel" placeholder="010-0000-0000" /></label><label><span>이메일 *</span><input required name="email" type="email" /></label><label className="consent"><input required type="checkbox" name="terms" value="agreed" /><span>회원 자격 확인, 결제 안내 및 개인정보 수집·이용에 동의합니다.</span></label><button className="button primary full" type="submit">결제 안내 요청하기 <ArrowRight /></button></form><p className="secure-note"><ShieldCheck /> 자격 확인 후 권한이 활성화됩니다.</p></div>}</Modal>;
}

function MembershipPage({ route }) {
  const params = new URLSearchParams(route.split('?')[1] || '');
  const [type, setType] = useState(params.get('type') === 'hospital' ? 'hospital' : 'doctor');
  const [selected, setSelected] = useState(null);
  const plans = membershipPlans.filter((plan) => plan.audience === type);
  return <>
    <PageHero tone="membership" eyebrow="VERIFIED ACCESS" title="필요한 핵심정보만, 필요한 만큼 열람하세요" description="기본 검색과 상담은 부담 없이 시작하고, 실제 결정에 필요한 검증 정보는 건별 열람권 또는 멤버십으로 이용합니다." />
    <section className="section membership-section"><div className="membership-tabs"><button className={type === 'doctor' ? 'active' : ''} onClick={() => setType('doctor')}><Stethoscope /> 의료인용</button><button className={type === 'hospital' ? 'active' : ''} onClick={() => setType('hospital')}><Building2 /> 병원용</button></div><div className="access-explain"><div><span className="access-number">FREE</span><h3>무료로 확인</h3><p>{type === 'doctor' ? '진료과, 지역, 기본 근무형태와 공개 공고' : '진료과, 경력 연차, 희망 지역과 익명 기본조건'}</p></div><ArrowRight /><div className="paid-access"><span className="access-number">PASS</span><h3>결제 후 열람</h3><p>{type === 'doctor' ? '상세 급여, 정확한 근무시간, 비공개 병원·포지션' : '검증 경력, 상세 희망조건, 동의 기반 소개 요청'}</p></div></div><div className="membership-grid">{plans.map((plan) => <article className={`membership-card ${plan.featured ? 'featured' : ''}`} key={plan.id}>{plan.featured && <span className="popular">추천</span>}<small>{plan.period === '월' ? 'MONTHLY PASS' : 'ONE-TIME ACCESS'}</small><h2>{plan.name}</h2><p>{plan.description}</p><div className="price"><strong>{plan.price.toLocaleString()}</strong><span>원 / {plan.period}</span></div><ul>{plan.features.map((feature) => <li key={feature}><Check /> {feature}</li>)}</ul><button className={`button ${plan.featured ? 'primary' : 'outline'} full`} onClick={() => setSelected(plan)}>이용권 신청</button></article>)}</div><div className="privacy-gate"><ShieldCheck /><div><strong>결제해도 개인정보를 바로 판매하지 않습니다</strong><p>병원은 검증된 익명 정보를 열람하고 소개를 요청합니다. 의료인의 명시적 동의가 확인된 뒤에만 필요한 범위의 정보가 전달됩니다.</p></div></div></section>
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
  const path = route.split('?')[0].replace(/\/$/, '') || '/';
  let page;
  if (path === '/') page = <HomePage />;
  else if (path === '/jobs') page = <JobsPage route={route} />;
  else if (path === '/talent') page = <TalentPage />;
  else if (path === '/headhunting') page = <HeadhuntingPage route={route} />;
  else if (path === '/advertise') page = <AdvertisePage />;
  else if (path === '/membership') page = <MembershipPage route={route} />;
  else if (path === '/about') page = <AboutPage />;
  else page = <NotFoundPage />;
  return <div className="app"><Header path={path} /><main>{page}</main><Footer /><div className="mobile-quickbar"><Link to="/jobs"><Search />채용 찾기</Link><Link className="mobile-ad" to="/advertise"><Building2 />공고 등록</Link></div></div>;
}
